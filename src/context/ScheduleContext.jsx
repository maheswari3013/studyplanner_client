import { createContext, useContext, useState, useCallback } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { scheduleApi } from '../api/scheduleApi';
import { examApi } from '../api/examApi';


const ScheduleContext = createContext(null);

export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within ScheduleProvider');
  }
  return context;
};

export function ScheduleProvider({ children }) {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState([]);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/schedule');
      setBlocks(res.data);
      return res.data;
    } catch (err) {
      toast.error('Failed to load schedule');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExams = useCallback(async () => {
    try {
      const res = await API.get('/exams');
      setExams(res.data);
      return res.data;
    } catch (err) {
      toast.error('Failed to load exams');
      return [];
    }
  }, []);

  const generateSchedule = useCallback(async (params) => {
    try {
      const res = await API.post('/schedule/generate', params);
      if (res.data.success) {
        toast.success(`Generated ${res.data.blocksCreated} study blocks`);
        await fetchSchedule();
        await fetchExams();
        return true;
      }
      return false;
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to generate schedule');
      return false;
    }
  }, [fetchSchedule, fetchExams]);

  const updateBlock = useCallback(async (blockId, updates) => {
    try {
      await API.patch(`/schedule/${blockId}`, updates);
      setBlocks(prev => prev.map(b => b._id === blockId? {...b,...updates } : b));
      return true;
    } catch (err) {
      toast.error('Failed to update block');
      return false;
    }
  }, []);

  const deleteBlock = useCallback(async (blockId) => {
    try {
      await API.delete(`/schedule/${blockId}`);
      setBlocks(prev => prev.filter(b => b._id!== blockId));
      toast.success('Block deleted');
      return true;
    } catch (err) {
      toast.error('Failed to delete block');
      return false;
    }
  }, []);

  const markBlockComplete = useCallback(async (blockId, actualMinutes) => {
    try {
      await API.post('/schedule/log', { blockId, actualMinutes });
      setBlocks(prev => prev.map(b =>
        b._id === blockId
         ? {...b, completed: true, actualDuration: actualMinutes }
          : b
      ));
      toast.success('Time logged');
      return true;
    } catch (err) {
      toast.error('Failed to log time');
      return false;
    }
  }, []);

  const markBlockMissed = useCallback(async (blockId) => {
    try {
      const res = await API.patch(`/schedule/${blockId}/missed`);
      if (res.data.success) {
        toast.success(`Rescheduled! Created ${res.data.newBlocksCreated} new blocks`);
        await fetchSchedule();
        return true;
      }
      return false;
    } catch (err) {
      if (err.response?.status === 404) {
        toast('Schedule was regenerated. Refreshing...');
        await fetchSchedule();
      } else {
        toast.error(err.response?.data?.msg || 'Failed to reschedule');
      }
      return false;
    }
  }, [fetchSchedule]);

  const getBlocksForDate = useCallback((date) => {
    const dateStr = date.toISOString().split('T')[0];
    return blocks
     .filter(b => b.date.split('T')[0] === dateStr)
     .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [blocks]);

  const getTodayBlocks = useCallback(() => {
    return getBlocksForDate(new Date());
  }, [getBlocksForDate]);

  const getUpcomingBlocks = useCallback((days = 7) => {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);

    return blocks.filter(b => {
      const blockDate = new Date(b.date);
      return blockDate >= today && blockDate <= endDate &&!b.completed &&!b.missed;
    }).sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      return dateCompare!== 0? dateCompare : a.startTime.localeCompare(b.startTime);
    });
  }, [blocks]);

  const getStats = useCallback(() => {
    const completed = blocks.filter(b => b.completed);
    const totalPlanned = blocks.reduce((sum, b) => sum + b.duration, 0);
    const totalActual = completed.reduce((sum, b) => sum + (b.actualDuration || 0), 0);
    const missed = blocks.filter(b => b.missed).length;

    return {
      totalBlocks: blocks.length,
      completedBlocks: completed.length,
      missedBlocks: missed,
      totalPlannedHours: (totalPlanned / 60).toFixed(1),
      totalActualHours: (totalActual / 60).toFixed(1),
      completionRate: blocks.length > 0? ((completed.length / blocks.length) * 100).toFixed(1) : 0
    };
  }, [blocks]);

  const value = {
    blocks,
    exams,
    loading,
    fetchSchedule,
    fetchExams,
    generateSchedule,
    updateBlock,
    deleteBlock,
    markBlockComplete,
    markBlockMissed,
    getBlocksForDate,
    getTodayBlocks,
    getUpcomingBlocks,
    getStats
  };

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}