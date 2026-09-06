import { prisma } from '../config/database';
import { NearbyQuery, SalonWithDistance } from '../types';
import { calculateWaitTime } from './queue.service';

// ─── NEARBY DISCOVERY ─────────────────────────────────────────────────────────

export async function getNearbySalons(query: NearbyQuery): Promise<SalonWithDistance[]> {
  const {
    lat,
    lng,
    radius = 5,
    minRating,
    page = 1,
    pageSize = 20,
  } = query;

  // Haversine formula via raw SQL for efficient geo-distance filtering
  const salons = await prisma.$queryRaw<Array<{
    id: string;
    name: string;
    description: string | null;
    address: string;
    area: string;
    city: string;
    lat: number;
    lng: number;
    photoUrl: string | null;
    photos: string[];
    openTime: string;
    closeTime: string;
    workingDays: number[];
    distance: number;
    avg_rating: number | null;
    review_count: bigint;
  }>>`
    SELECT
      s.id,
      s.name,
      s.description,
      s.address,
      s.area,
      s.city,
      s.lat,
      s.lng,
      s."photoUrl",
      s.photos,
      s."openTime",
      s."closeTime",
      s."workingDays",
      (
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${lat})) *
            cos(radians(s.lat)) *
            cos(radians(s.lng) - radians(${lng})) +
            sin(radians(${lat})) *
            sin(radians(s.lat))
          ))
        )
      ) AS distance,
      AVG(r.rating) AS avg_rating,
      COUNT(r.id) AS review_count
    FROM salons s
    LEFT JOIN barbers b ON b."salonId" = s.id AND b."isActive" = true
    LEFT JOIN reviews r ON r."barberId" = b.id AND r."isPublished" = true
    WHERE
      s."isActive" = true
      AND s."verificationStatus" = 'VERIFIED'
      AND (
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${lat})) *
            cos(radians(s.lat)) *
            cos(radians(s.lng) - radians(${lng})) +
            sin(radians(${lat})) *
            sin(radians(s.lat))
          ))
        )
      ) < ${radius}
    GROUP BY s.id
    HAVING (${minRating ? minRating : 0}) = 0 OR AVG(r.rating) >= ${minRating || 0}
    ORDER BY distance ASC
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `;
  // Fetch barbers + availability for each salon
  const salonIds = salons.map((s) => s.id);
  const barbers = await prisma.barber.findMany({
    where: { salonId: { in: salonIds }, isActive: true },
    include: {
      services: { where: { isActive: true } },
      availability: true,
      reviews: { select: { rating: true } },
    },
  });

  const barbersBySalon = barbers.reduce(
    (acc, b) => {
      if (!acc[b.salonId]) acc[b.salonId] = [];
      acc[b.salonId].push(b);
      return acc;
    },
    {} as Record<string, typeof barbers>
  );

  return salons.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    address: s.address,
    area: s.area,
    city: s.city,
    lat: s.lat,
    lng: s.lng,
    photoUrl: s.photoUrl,        // ← changed from s.photo_url
    photos: s.photos || [],
    openTime: s.openTime,        // ← changed from s.open_time
    closeTime: s.closeTime,      // ← changed from s.close_time
    workingDays: s.workingDays || [],  // ← changed from s.working_days
    distance: Math.round(s.distance * 100) / 100,
    averageRating: s.avg_rating ? Math.round(s.avg_rating * 10) / 10 : undefined,
    reviewCount: Number(s.review_count),
    barbers: (barbersBySalon[s.id] || []).map((b) => ({
      id: b.id,
      name: b.name,
      bio: b.bio,
      photoUrl: b.photoUrl,
      experience: b.experience,
      specialties: b.specialties,
      availability: b.availability
        ? {
            status: b.availability.status,
            queueCount: b.availability.queueCount,
            maxQueueSize: b.availability.maxQueueSize,
            estimatedWaitMins: calculateWaitTime(b.availability.queueCount),
          }
        : null,
      services: b.services.map((svc) => ({
        id: svc.id,
        name: svc.name,
        description: svc.description,
        price: svc.price,
        durationMins: svc.durationMins,
      })),
      averageRating:
        b.reviews.length > 0
          ? Math.round((b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length) * 10) / 10
          : undefined,
      reviewCount: b.reviews.length,
    })),
  }));
}

export async function getSalonById(salonId: string): Promise<SalonWithDistance | null> {
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    include: {
      barbers: {
        where: { isActive: true },
        include: {
          services: { where: { isActive: true } },
          availability: { include: { queueEntries: { orderBy: { position: 'asc' } } } },
          reviews: { select: { rating: true } },
        },
      },
    },
  });

  if (!salon) return null;

  const avgRating =
    salon.barbers.flatMap((b) => b.reviews).reduce(
      (acc, r, _, arr) => acc + r.rating / arr.length,
      0
    );

  return {
    id: salon.id,
    name: salon.name,
    description: salon.description,
    address: salon.address,
    area: salon.area,
    city: salon.city,
    lat: salon.lat,
    lng: salon.lng,
    photoUrl: salon.photoUrl,
    photos: salon.photos,
    openTime: salon.openTime,
    closeTime: salon.closeTime,
    workingDays: salon.workingDays,
    averageRating: avgRating ? Math.round(avgRating * 10) / 10 : undefined,
    reviewCount: salon.barbers.flatMap((b) => b.reviews).length,
    barbers: salon.barbers.map((b) => ({
      id: b.id,
      name: b.name,
      bio: b.bio,
      photoUrl: b.photoUrl,
      experience: b.experience,
      specialties: b.specialties,
      availability: b.availability
        ? {
            status: b.availability.status,
            queueCount: b.availability.queueCount,
            maxQueueSize: b.availability.maxQueueSize,
            estimatedWaitMins: calculateWaitTime(b.availability.queueCount),
          }
        : null,
      services: b.services.map((svc) => ({
        id: svc.id,
        name: svc.name,
        description: svc.description,
        price: svc.price,
        durationMins: svc.durationMins,
      })),
      averageRating:
        b.reviews.length > 0
          ? Math.round((b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length) * 10) / 10
          : undefined,
      reviewCount: b.reviews.length,
    })),
  };
}
