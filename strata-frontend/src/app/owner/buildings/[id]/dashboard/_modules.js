// owner/buildings/[id]/dashboard/_modules.js
import UpcomingBookingsCard from './_components/UpcomingBookingsCard';
import OffersCard from './_components/OffersCard';
import OwnerMaintenanceCard from './_components/OwnerMaintenanceCard';
import OwnerPollsCard from './_components/OwnerPollsCard';
import ScheduleCard from '@/components/dashboard/ScheduleCard';
import UpcomingEventsCard from '@/components/dashboard/UpcomingEventsCard';

export function getOwnerDashboardModules({
  building,
  buildingId,
  announcements,
  events,
  polls,
  upcomingBookings,
  openRequests,
  openPollsCount,
}) {
  return [
    {
      key: 'resources', // feature key in building_features
      title: 'Upcoming Bookings',
      area: 'sidebar',
      priority: 10,
      render: () => (
        <UpcomingBookingsCard
          buildingId={buildingId}
          upcomingBookings={upcomingBookings}
        />
      ),
    },
    {
      key: 'upcoming-events',
      title: 'Upcoming Events',
      area: 'main',
      priority: 5,
      always: true,
      render: () => (
        <UpcomingEventsCard
          basePath={`/owner/buildings/${buildingId}`}
          announcements={announcements}
          events={events}
          polls={polls}
          role="owner"
          visibleCount={4}
          limit={8}
        />
      ),
    },
    {
      key: 'offers', // <- NOT in building_features by default
      title: 'Offers',
      area: 'main',
      priority: 20,
      always: true, // keep it always on unless you add feature toggle for it
      render: () => <OffersCard />,
    },
    {
      key: 'maintenance', // feature key in building_features
      title: 'Maintenance Requests',
      area: 'main',
      priority: 30,
      render: () => (
        <OwnerMaintenanceCard
          buildingId={buildingId}
          openRequests={openRequests}
        />
      ),
    },
    {
      key: 'polls', // feature key in building_features
      title: 'Polls & Votes',
      area: 'sidebar',
      priority: 40,
      render: () => (
        <OwnerPollsCard
          buildingId={buildingId}
          openPollsCount={openPollsCount}
        />
      ),
    },
    {
      key: 'schedule',
      title: 'Schedule',
      area: 'sidebar',
      priority: 50,
      always: true,
      render: () => (
        <ScheduleCard
          building={building}
          announcements={announcements}
          pending={openRequests}
          completed={[]}
          bookings={upcomingBookings}
        />
      ),
    },
  ].sort((a, b) => a.priority - b.priority);
}
