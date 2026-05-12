import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, TrendingDown, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function GoalCard({ goal, snapshot }) {
  if (!goal || !snapshot) {
    return null;
  }

  // Bereken huidige waarde en voortgang vanuit snapshot
  const calculateGoalStatus = () => {
    if (goal.type === 'gewicht') {
      const latestWeight = snapshot.current_state?.weight?.latest_any;
      if (!latestWeight) {
        return {
          currentValue: goal.start_waarde,
          progress: 0,
          isAchieved: false,
          trend: 'stable'
        };
      }

      const currentValue = latestWeight.value;
      const range = Math.abs(goal.streef_waarde - goal.start_waarde);
      const change = Math.abs(currentValue - goal.start_waarde);
      const progress = range > 0 ? Math.min(100, (change / range) * 100) : 0;

      // 3% marge voor gewichtsdoel
      const margin = goal.streef_waarde * 0.03;
      const isAchieved = Math.abs(currentValue - goal.streef_waarde) <= margin;

      // Trend bepalen vanuit trends in snapshot
      let trend = 'stable';
      const weights = snapshot.trends?.weight_last_6 || [];
      if (weights.length >= 2) {
        const latest = weights[0].gewicht_kg;
        const previous = weights[1].gewicht_kg;
        if (latest < previous) trend = 'down';
        if (latest > previous) trend = 'up';
      }

      return { currentValue, progress, isAchieved, trend };
    }

    // Symptoom doelen
    if (goal.type === 'symptoom' && goal.symptom_key) {
      const symptomData = snapshot.current_state?.symptomen?.[goal.symptom_key];
      if (!symptomData) {
        return {
          currentValue: goal.start_waarde,
          progress: 0,
          isAchieved: false,
          trend: 'stable'
        };
      }

      const currentValue = symptomData.current;
      const range = Math.abs(goal.streef_waarde - goal.start_waarde);
      const change = Math.abs(goal.start_waarde - currentValue);
      const progress = range > 0 ? Math.min(100, (change / range) * 100) : 0;

      const isAchieved = currentValue <= goal.streef_waarde;

      // Trend bepalen
      let trend = 'stable';
      if (symptomData.trend) {
        trend = symptomData.trend;
      }

      return { currentValue, progress, isAchieved, trend };
    }

    return {
      currentValue: goal.start_waarde,
      progress: 0,
      isAchieved: false,
      trend: 'stable'
    };
  };

  const status = calculateGoalStatus();

  // Symptoom labels
  const symptomLabels = {
    jeuk: 'Jeuk',
    roodheid: 'Roodheid',
    schilfers: 'Schilfers',
    stoelgang: 'Stoelgang',
    gedrag: 'Gedrag',
    energie: 'Energie'
  };

  const getStatusColor = () => {
    if (status.isAchieved) return 'bg-green-100 text-green-800 border-green-200';
    if (status.progress > 50) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getTrendIcon = () => {
    if (status.trend === 'down' || status.trend === 'improving') {
      return <TrendingDown className="w-4 h-4 text-green-600" />;
    }
    if (status.trend === 'up' || status.trend === 'worsening') {
      return <TrendingUp className="w-4 h-4 text-red-600" />;
    }
    return null;
  };

  return (
    <Card className="border-2 rounded-2xl shadow-sm hover:shadow-md transition-shadow" 
          style={{ borderColor: status.isAchieved ? '#4ade80' : 'var(--primary-pink)' }}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
                 style={{ backgroundColor: status.isAchieved ? '#4ade80' : 'var(--primary-pink)' }}>
              {status.isAchieved ? (
                <CheckCircle className="w-5 h-5 text-white" />
              ) : (
                <Target className="w-5 h-5" style={{ color: 'var(--primary-blue)' }} />
              )}
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                {goal.type === 'symptoom' && goal.symptom_key 
                  ? symptomLabels[goal.symptom_key] 
                  : 'Gewicht'}
              </CardTitle>
              <p className="text-xs text-gray-600 mt-0.5">
                {goal.doel_omschrijving}
              </p>
            </div>
          </div>
          <Badge className={`rounded-full text-xs ${getStatusColor()}`}>
            {status.isAchieved ? 'Behaald' : 'Actief'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Huidige vs Doel waarden */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Start</p>
            <p className="text-lg font-bold" style={{ color: 'var(--primary-blue)' }}>
              {goal.start_waarde}{goal.type === 'gewicht' ? ' kg' : '/10'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Doel</p>
            <p className="text-lg font-bold" style={{ color: 'var(--primary-blue)' }}>
              {goal.streef_waarde}{goal.type === 'gewicht' ? ' kg' : '/10'}
            </p>
          </div>
        </div>

        {/* Huidige waarde */}
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-gray-600">Huidige waarde</p>
            {getTrendIcon()}
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--primary-blue)' }}>
            {status.currentValue}{goal.type === 'gewicht' ? ' kg' : '/10'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Voortgang</span>
            <span className="font-semibold">{Math.round(status.progress)}%</span>
          </div>
          <Progress 
            value={status.progress} 
            className="h-2"
            style={{ 
              '--progress-background': status.isAchieved ? '#4ade80' : 'var(--primary-blue)'
            }}
          />
        </div>

        {/* Metadata */}
        <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Start: {format(new Date(goal.start_datum), 'd MMM yyyy', { locale: nl })}</span>
          </div>
          {goal.consecutive_success_count > 0 && (
            <Badge variant="outline" className="text-xs">
              {goal.consecutive_success_count}x op doel
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}