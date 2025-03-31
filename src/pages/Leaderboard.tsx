import React, { useEffect, useState } from 'react';
import {
  Card,
  Title3,
  Avatar,
  Text,
  Select,
  Spinner
} from '@fluentui/react-components';
import {
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Trophy24Filled } from '@fluentui/react-icons';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string;
  rank: number;
  metric_value: number;
}

interface RankingParams {
  period: 'this_week' | 'this_month' | 'all_time';
  metric: 'distance' | 'duration' | 'elevation' | 'max_speed' | 'average_speed';
}

const RankCard = ({ rank, entry, metric }) => {
  const medalColors = {
    1: 'text-yellow-500',
    2: 'text-gray-400',
    3: 'text-amber-700'
  };

  const formatValue = (value: number, metric: string) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0';
    }

    switch (metric) {
      case 'distance':
        return `${(value / 1000).toFixed(1)} km`;
      case 'duration':
        return `${Math.floor(value / 3600)}h ${Math.floor((value % 3600) / 60)}m`;
      case 'elevation':
        return `${value.toFixed(0)} m`;
      case 'max_speed':
      case 'average_speed':
        return `${value.toFixed(1)} km/h`;
      default:
        return value.toString();
    }
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-card hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-all animate-fade-in w-full">
      {/* Rank Column */}
      <div className="w-8 flex-shrink-0">
        <div className={`text-2xl font-bold ${medalColors[rank] || 'text-gray-600'} flex justify-center`}>
          {rank <= 3 ? (
            <div className="w-8 h-8 flex items-center justify-center">
              {rank === 1 ? <Trophy24Filled /> : rank === 2 ? <Trophy24Filled /> : <Trophy24Filled />}
            </div>
          ) : (
            <span className="w-8 text-center">{rank}</span>
          )}
        </div>
      </div>

      {/* Avatar Column */}
      <div className="w-12 flex-shrink-0">
        <Avatar
          image={{ src: entry.avatar_url || undefined }}
          name={entry.username}
          size={40}
          className={rank <= 3 ? 'ring-2 ring-offset-2 ring-brand-500' : ''}
        />
      </div>

      {/* Username Column */}
      <div className="flex-1 min-w-0">
        <Text weight="semibold" className="truncate">
          {entry.username}
        </Text>
      </div>

      {/* Value Column */}
      <div className="flex-shrink-0 text-right">
        <Text className="text-subtle font-medium">
          {formatValue(entry.metric_value, metric)}
        </Text>
      </div>
    </div>
  );
};

const UserRankingContext = ({ currentUserRank, entries, metric }) => {
  // Don't hide if user is in top 3 - we want to show context regardless
  const above = entries.find(e => e.rank === currentUserRank - 1);
  const current = entries.find(e => e.rank === currentUserRank);
  const below = entries.find(e => e.rank === currentUserRank + 1);

  if (!current) return null;

  return (
    <Card className="mt-6">
      <Title3 className="mb-4">Your Position</Title3>
      <div className="space-y-6">
        {above && (
          <div className="flex items-center gap-2 text-subtle">
            <ArrowUp className="w-4 h-4 text-subtle" />
            <RankCard rank={above.rank} entry={above} metric={metric} />
          </div>
        )}
        <div className="relative">
          <div className="absolute -left-6 top-1/2 -translate-y-1/2">
            <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
          </div>
          <div className="bg-brand-50 dark:bg-brand-900/20 rounded-lg">
            <RankCard rank={current.rank} entry={current} metric={metric} />
          </div>
        </div>
        {below && (
          <div className="flex items-center gap-2 text-subtle">
            <ArrowDown className="w-4 h-4 text-subtle" />
            <RankCard rank={below.rank} entry={below} metric={metric} />
          </div>
        )}
      </div>
    </Card>
  );
};

const Leaderboard = () => {
  const [params, setParams] = useState<RankingParams>({
    period: 'all_time',
    metric: 'distance'
  });
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        const { data, error } = await supabase.rpc('get_leaderboard', {
          p_user_id: user.id,
          p_metric: params.metric,
          p_period: params.period
        });

        if (error) {
          console.error('Error fetching leaderboard:', error);
          throw error;
        }

        setEntries(data || []);
        const userEntry = data?.find(entry => entry.user_id === user.id);
        setCurrentUserRank(userEntry?.rank || null);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [params]);

  const formatValue = (value: number, metric: string) => {
    switch (metric) {
      case 'distance':
        return `${(value / 1000).toFixed(1)} km`;
      case 'duration':
        const hours = Math.floor(value / 3600);
        const minutes = Math.floor((value % 3600) / 60);
        return `${hours}h ${minutes}m`;
      case 'elevation':
        return `${Math.round(value)} m`;
      case 'max_speed':
      case 'average_speed':
        return `${value.toFixed(1)} km/h`;
      default:
        return value.toString();
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24 md:pb-0"> {/* Added padding-bottom for mobile */}
      <section className="relative bg-card/5 px-4 py-8 md:py-12 md:px-8 mica">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <div className="text-2xl md:text-3xl font-semibold">Leaderboard</div>
              <div className="text-subtle">See how you rank among other riders</div>
            </div>
            <div className="flex flex-wrap gap-4 w-full md:w-auto">
              <Select
                value={params.period}
                onChange={(e, data) => setParams(prev => ({ ...prev, period: data.value as RankingParams['period'] }))}
                className="w-full md:w-auto"
              >
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="all_time">All Time</option>
              </Select>
              <Select
                value={params.metric}
                onChange={(e, data) => setParams(prev => ({ ...prev, metric: data.value as RankingParams['metric'] }))}
                className="w-full md:w-auto"
              >
                <option value="distance">Distance</option>
                <option value="duration">Duration</option>
                <option value="elevation">Elevation</option>
                <option value="max_speed">Max Speed</option>
                <option value="average_speed">Average Speed</option>
              </Select>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="large" />
          </div>
        ) : (
          <>
            <Card className="p-6 depth-2">
              <Title3 className="mb-4">Top Performers</Title3>
              <div className="space-y-6">
                {entries.slice(0, 3).map((entry, index) => (
                  <RankCard
                    key={entry.user_id}
                    rank={entry.rank}
                    entry={entry}
                    metric={params.metric}
                  />
                ))}
              </div>
            </Card>

            <UserRankingContext
              currentUserRank={currentUserRank}
              entries={entries}
              metric={params.metric}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;