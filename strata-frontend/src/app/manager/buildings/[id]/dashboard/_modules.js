// manager/dashboard/_modules.js
import AmenitiesCard from './_components/AmenitiesCard';
import MaintenanceCard from './_components/MaintenanceCard';
import RewardsCard from './_components/RewardsCard';
import ScheduleCard from '@/components/dashboard/ScheduleCard';
import PollsCard from '@/components/dashboard/PollsCard';
import UpcomingEventsCard from '@/components/dashboard/UpcomingEventsCard';

export function getDashboardModules({
  building,
  announcements,
  events,
  polls,
  pending,
  completed,
  resources,
  bookings,
  openPollsCount,
}) {
  return [
    {
      key: 'resources',
      title: 'Amenities',
      area: 'full',
      render: () => <AmenitiesCard building={building} resources={resources} />,
      priority: 10,
    },

    {
      key: 'maintenance',
      title: 'Maintenance',
      area: 'main',
      render: () => (
        <MaintenanceCard
          building={building}
          pending={pending}
          completed={completed}
        />
      ),
      priority: 20,
    },
    {
      key: 'rewards',
      title: 'Rewards',
      area: 'main',
      render: () => <RewardsCard />,
      priority: 30,
      always: true,
    },
    {
      key: 'polls',
      title: 'Polls',
      area: 'sidebar',
      render: () => (
        <PollsCard
          buildingId={building?.id}
          basePath="manager"
          openPollsCount={openPollsCount || 0}
        />
      ),
      priority: 35,
    },
    {
      key: 'upcoming-events',
      title: 'Upcoming Events',
      area: 'full',
      render: () => (
        <UpcomingEventsCard
          basePath={`/manager/buildings/${building.id}`}
          announcements={announcements}
          events={events}
          polls={polls}
          role="manager"
        />
      ),
      priority: 5,
      always: true,
    },
    {
      key: 'schedule',
      title: 'Schedule',
      area: 'sidebar',
      render: () => (
        <ScheduleCard
          basePath={`/manager/buildings/${building.id}`}
          announcements={announcements}
          events={events}
          pending={pending}
          completed={completed}
          bookings={bookings}
        />
      ),
      priority: 40,
      always: true,
    },
  ].sort((a, b) => a.priority - b.priority);
}
