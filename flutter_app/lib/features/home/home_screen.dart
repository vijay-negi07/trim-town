import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../core/api/api_service.dart';
import '../../core/api/socket_service.dart';
import '../../core/constants/app_constants.dart';
import '../../core/models/models.dart';
import '../salon/salon_detail_screen.dart';
import '../appointment/appointments_screen.dart';
import '../profile/profile_screen.dart';
import 'widgets/salon_card.dart';
import 'widgets/status_chip.dart';

class HomeScreen extends StatefulWidget {
  final String userRole;
  const HomeScreen({super.key, this.userRole = 'CUSTOMER'});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _api = ApiService();
  final _socket = SocketService();
  final _searchController = TextEditingController();

  // Customer State
  List<Salon> _salons = [];
  List<Salon> _filtered = [];
  bool _loading = true;
  String? _error;
  Position? _position;
  int _bottomNavIndex = 0;

  // Barber Partner State
  String _barberStatus = 'AVAILABLE'; // 'AVAILABLE' | 'BUSY' | 'CLOSED'
  final List<Map<String, String>> _queueList = [
    {'id': '1', 'name': 'Rahul Sharma', 'service': 'Haircut', 'time': '10 mins'},
    {'id': '2', 'name': 'Amit Kumar', 'service': 'Beard Trim', 'time': '25 mins'},
    {'id': '3', 'name': 'Vikas Joshi', 'service': 'Haircut & Styling', 'time': '40 mins'},
  ];
  int _servedToday = 6;
  int _todayEarnings = 1450;

  bool get isBarber => widget.userRole == 'BARBER';

  @override
  void initState() {
    super.initState();
    if (isBarber) {
      _initBarber();
    } else {
      _initCustomer();
    }
  }

  Future<void> _initCustomer() async {
    await _getLocation();
    await _loadSalons();
    _socket.joinCity('Haldwani');
    _socket.onAnyQueueUpdate(_onQueueUpdate);
  }

  Future<void> _initBarber() async {
    setState(() => _loading = false);
    _socket.joinCity('Haldwani');
  }

  Future<void> _getLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return;
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.deniedForever) return;
      _position = await Geolocator.getCurrentPosition();
    } catch (_) {}
  }

  Future<void> _loadSalons() async {
    setState(() { _loading = true; _error = null; });
    try {
      final salons = await _api.getNearbySalons(
        lat: _position?.latitude ?? AppConstants.defaultLat,
        lng: _position?.longitude ?? AppConstants.defaultLng,
      );
      setState(() {
        _salons = salons;
        _filtered = salons;
        _loading = false;
      });
    } catch (e) {
      setState(() { _loading = false; _error = e.toString(); });
    }
  }

  void _onQueueUpdate(Map<String, dynamic> data) {
    _loadSalons();
  }

  void _search(String query) {
    setState(() {
      _filtered = _salons.where((s) =>
        s.name.toLowerCase().contains(query.toLowerCase()) ||
        s.area.toLowerCase().contains(query.toLowerCase())
      ).toList();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _socket.removeListener('*', _onQueueUpdate);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (isBarber) {
      return _buildBarberScaffold();
    }
    return _buildCustomerScaffold();
  }

  // ─── BARBER PARTNER APP ──────────────────────────────────────────────────

  Widget _buildBarberScaffold() {
    if (_bottomNavIndex == 1) return _buildBarberEarningsScreen();
    if (_bottomNavIndex == 2) return const ProfileScreen();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('TrimTown Partner 💈', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.orange.shade800,
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_alt_1_outlined),
            tooltip: 'Add Walk-in',
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Toggle Card
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Live Shop Status', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _statusToggleButton('AVAILABLE', '🟢 Open', Colors.green),
                        const SizedBox(width: 8),
                        _statusToggleButton('BUSY', '🟡 Busy', Colors.amber.shade700),
                        const SizedBox(width: 8),
                        _statusToggleButton('CLOSED', '🔴 Closed', Colors.red),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Queue Summary Cards
            Row(
              children: [
                _metricCard('Waiting Queue', '${_queueList.length}', Icons.people_outline, Colors.blue),
                const SizedBox(width: 12),
                _metricCard('Served Today', '$_servedToday', Icons.check_circle_outline, Colors.green),
              ],
            ),
            const SizedBox(height: 24),

            // Live Queue List
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Live Queue', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                TextButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Walk-in'),
                ),
              ],
            ),
            const SizedBox(height: 8),

            if (_queueList.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: Text('No customers in queue', style: TextStyle(color: AppColors.textMuted)),
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _queueList.length,
                itemBuilder: (context, index) {
                  final customer = _queueList[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Colors.orange.shade100,
                        child: Text('#${index + 1}', style: TextStyle(color: Colors.orange.shade900, fontWeight: FontWeight.bold)),
                      ),
                      title: Text(customer['name']!, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('${customer['service']} · Est. ${customer['time']}'),
                      trailing: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                        onPressed: () {
                          setState(() {
                            _queueList.removeAt(index);
                            _servedToday++;
                            _todayEarnings += 200;
                          });
                        },
                        child: const Text('Done ✓'),
                      ),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _bottomNavIndex,
        onTap: (i) => setState(() => _bottomNavIndex = i),
        selectedItemColor: Colors.orange.shade800,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.queue), label: 'Queue'),
          BottomNavigationBarItem(icon: Icon(Icons.attach_money), label: 'Earnings'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }

  Widget _statusToggleButton(String statusKey, String label, Color color) {
    final bool isSelected = _barberStatus == statusKey;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _barberStatus = statusKey),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? color : color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: color, width: isSelected ? 2 : 1),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : color,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _metricCard(String title, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 12),
            Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            Text(title, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }

  Widget _buildBarberEarningsScreen() {
    return Scaffold(
      appBar: AppBar(title: const Text('Partner Earnings'), backgroundColor: Colors.orange.shade800),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.orange.shade800,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                children: [
                  const Text("Today's Revenue", style: TextStyle(color: Colors.white70)),
                  const SizedBox(height: 8),
                  Text('₹$_todayEarnings', style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: Colors.white)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── CUSTOMER APP ─────────────────────────────────────────────────────────

  Widget _buildCustomerScaffold() {
    if (_bottomNavIndex == 2) return const AppointmentsScreen();
    if (_bottomNavIndex == 3) return const ProfileScreen();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 140,
            pinned: true,
            backgroundColor: AppColors.dark,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: AppColors.dark,
                padding: const EdgeInsets.fromLTRB(20, 56, 20, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('TrimTown ✂️',
                              style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: Colors.white)),
                            Text('Haldwani · ${_filtered.length} salons nearby',
                              style: const TextStyle(color: Colors.white60, fontSize: 12)),
                          ],
                        ),
                        IconButton(
                          onPressed: _loadSalons,
                          icon: const Icon(Icons.refresh, color: Colors.white70),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(52),
              child: Container(
                color: AppColors.dark,
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: TextField(
                  controller: _searchController,
                  onChanged: _search,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Search salons, areas...',
                    hintStyle: const TextStyle(color: Colors.white38),
                    prefixIcon: const Icon(Icons.search, color: Colors.white38, size: 20),
                    filled: true,
                    fillColor: Colors.white10,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: SizedBox(
              height: 48,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                children: [
                  _filterChip('All', true),
                  _filterChip('🟢 Available', false),
                  _filterChip('⭐ Top rated', false),
                  _filterChip('📍 Nearest', false),
                ],
              ),
            ),
          ),

          if (_loading)
            SliverList(delegate: SliverChildBuilderDelegate(
              (_, __) => const SalonCardSkeleton(),
              childCount: 5,
            ))
          else if (_error != null)
            SliverToBoxAdapter(child: _buildError())
          else if (_filtered.isEmpty)
            SliverToBoxAdapter(child: _buildEmpty())
          else
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (_, i) => SalonCard(
                  salon: _filtered[i],
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => SalonDetailScreen(salon: _filtered[i])),
                  ),
                ),
                childCount: _filtered.length,
              ),
            ),

          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),

      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _bottomNavIndex,
        onTap: (i) => setState(() => _bottomNavIndex = i),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textLight,
        selectedFontSize: 11,
        unselectedFontSize: 11,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.map_outlined), activeIcon: Icon(Icons.map), label: 'Map'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_today_outlined), activeIcon: Icon(Icons.calendar_today), label: 'Bookings'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }

  Widget _filterChip(String label, bool selected) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label, style: TextStyle(fontSize: 12, color: selected ? Colors.white : AppColors.textMuted)),
        selected: selected,
        onSelected: (_) {},
        backgroundColor: Colors.white,
        selectedColor: AppColors.primary,
        checkmarkColor: Colors.white,
        side: const BorderSide(color: AppColors.border),
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
    );
  }

  Widget _buildError() => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          const Icon(Icons.wifi_off, size: 48, color: AppColors.textLight),
          const SizedBox(height: 12),
          Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textMuted)),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _loadSalons, child: const Text('Retry')),
        ],
      ),
    ),
  );

  Widget _buildEmpty() => const Center(
    child: Padding(
      padding: EdgeInsets.all(32),
      child: Column(
        children: [
          Icon(Icons.search_off, size: 48, color: AppColors.textLight),
          SizedBox(height: 12),
          Text('No salons found nearby', style: TextStyle(color: AppColors.textMuted)),
        ],
      ),
    ),
  );
}
