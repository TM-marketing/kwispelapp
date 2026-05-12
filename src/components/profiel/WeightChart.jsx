import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function WeightChart({ weights, dogName }) {
  if (!weights || weights.length === 0) {
    return (
      <Card className="border-2 rounded-2xl" style={{ borderColor: 'var(--primary-pink)' }}>
        <CardHeader>
          <CardTitle className="kwiek-heading">Gewichtsontwikkeling</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-30" 
                       style={{ color: 'var(--primary-blue)' }} />
            <p className="text-gray-600">Nog geen gewichtsmetingen beschikbaar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedWeights = [...weights].sort((a, b) => 
    new Date(a.datum).getTime() - new Date(b.datum).getTime()
  );

  const chartData = sortedWeights.map(w => ({
    datum: format(new Date(w.datum), 'd MMM', { locale: nl }),
    gewicht: w.gewicht_kg,
    fullDate: w.datum,
    bron: w.bron,
    verified: w.verified_by_expert
  }));

  const latestWeight = sortedWeights[sortedWeights.length - 1];
  const previousWeight = sortedWeights.length > 1 ? sortedWeights[sortedWeights.length - 2] : null;
  const weightChange = previousWeight ? latestWeight.gewicht_kg - previousWeight.gewicht_kg : 0;

  // Bronlabels voor tooltip
  const bronLabels = {
    intake: 'Intake',
    expert: 'Expert',
    owner: 'Eigenaar',
    scale_sync: 'Weegschaal'
  };

  return (
    <Card className="border-2 rounded-2xl shadow-md" style={{ borderColor: 'var(--primary-pink)' }}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="kwiek-heading">Gewichtsontwikkeling</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {sortedWeights.length === 1 ? 'Startgewicht' : `Laatste meting: ${format(new Date(latestWeight.datum), 'd MMMM yyyy', { locale: nl })}`}
            </p>
            {latestWeight.verified_by_expert && (
              <p className="text-xs text-green-600 mt-1">✓ Door expert geverifieerd</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold" style={{ color: 'var(--primary-blue)' }}>
              {latestWeight.gewicht_kg} kg
            </p>
            {previousWeight && (
              <div className="flex items-center justify-end mt-1">
                {weightChange > 0 ? (
                  <TrendingUp className="w-4 h-4 mr-1 text-orange-500" />
                ) : weightChange < 0 ? (
                  <TrendingDown className="w-4 h-4 mr-1 text-green-500" />
                ) : (
                  <Minus className="w-4 h-4 mr-1 text-gray-500" />
                )}
                <span className={`text-sm font-medium ${
                  weightChange > 0 ? 'text-orange-500' : 
                  weightChange < 0 ? 'text-green-500' : 
                  'text-gray-500'
                }`}>
                  {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedWeights.length === 1 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-2">Startgewicht vastgelegd</p>
            <p className="text-sm text-gray-500">Voeg meer metingen toe om de evolutie te zien</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F7C9D2" />
              <XAxis 
                dataKey="datum" 
                stroke="#1D3C87"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#1D3C87"
                style={{ fontSize: '12px' }}
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: '2px solid #F7C9D2',
                  borderRadius: '12px'
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return format(new Date(payload[0].payload.fullDate), 'd MMMM yyyy', { locale: nl });
                  }
                  return label;
                }}
                formatter={(value, name, props) => {
                  const bron = bronLabels[props.payload.bron] || props.payload.bron;
                  const verified = props.payload.verified ? ' ✓' : '';
                  return [`${value} kg (${bron}${verified})`, 'Gewicht'];
                }}
              />
              <Line 
                type="monotone" 
                dataKey="gewicht" 
                stroke="#1D3C87" 
                strokeWidth={3}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={payload.verified ? 7 : 5}
                      fill={payload.verified ? '#F7C9D2' : '#E5E7EB'}
                      stroke="#1D3C87"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        
        {/* Legenda */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-200 border-2 border-blue-900"></div>
            <span>Geverifieerd door expert</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-300 border-2 border-blue-900"></div>
            <span>Niet geverifieerd</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}