import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, TrendingUp, Target, Activity } from "lucide-react";

export default function QuickStats({ sessions, weights, goals }) {
  const stats = [
    {
      label: "Totaal Sessies",
      value: sessions?.length || 0,
      icon: Activity,
      color: "bg-blue-100 text-blue-700"
    },
    {
      label: "Gewichtsmetingen",
      value: weights?.length || 0,
      icon: TrendingUp,
      color: "bg-green-100 text-green-700"
    },
    {
      label: "Actieve Doelen",
      value: goals?.filter(g => g.status === 'on_track').length || 0,
      icon: Target,
      color: "bg-purple-100 text-purple-700"
    },
    {
      label: "Laatste Sessie",
      value: sessions && sessions.length > 0 
        ? new Date(Math.max(...sessions.map(s => new Date(s.datum)))).toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' })
        : '-',
      icon: Calendar,
      color: "bg-orange-100 text-orange-700"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card 
          key={index}
          className="border-2 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
          style={{ borderColor: 'var(--primary-pink)' }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--primary-blue)' }}>
              {stat.value}
            </p>
            <p className="text-xs text-gray-600 mt-1">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}