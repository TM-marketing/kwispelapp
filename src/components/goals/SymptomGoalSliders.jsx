import React from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

const symptoomLabels = {
  jeuk: "Jeuk",
  roodheid: "Roodheid",
  schilfers: "Schilfers",
  stoelgang: "Stoelgang",
  gedrag: "Gedrag",
  energie: "Energie"
};

export default function SymptomGoalSliders({ 
  symptoomScores, 
  onSymptoomScoreChange,
  goalSettings,
  onGoalSettingChange 
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center">
        {/* Header Row */}
        <div className="text-sm font-semibold" style={{ color: 'var(--primary-blue)' }}>
          Maak doel
        </div>
        <div className="flex justify-between items-center px-2">
          <span className="text-xs font-medium text-green-600">Positief</span>
          <span className="text-xs font-medium text-red-600">Negatief</span>
        </div>
        <div className="text-sm font-semibold text-right" style={{ color: 'var(--primary-blue)' }}>
          Gestelde doel?
        </div>
      </div>

      {Object.entries(symptoomScores).map(([key, value]) => (
        <div key={key} className="grid grid-cols-[auto_1fr_auto] gap-4 items-center">
          {/* Kolom 1: Checkbox */}
          <div className="flex items-center justify-center">
            <Checkbox
              id={`goal-${key}`}
              checked={goalSettings[key]?.enabled || false}
              onCheckedChange={(checked) => onGoalSettingChange(key, 'enabled', checked)}
            />
          </div>

          {/* Kolom 2: Slider met Label en Waarde */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor={`slider-${key}`} className="capitalize">
                {symptoomLabels[key]}
              </Label>
              <span className="font-medium text-lg" style={{ color: 'var(--primary-blue)' }}>
                {value}
              </span>
            </div>
            <Slider
              id={`slider-${key}`}
              value={[value]}
              onValueChange={(vals) => onSymptoomScoreChange(key, vals[0])}
              max={10}
              step={1}
              className="w-full"
            />
          </div>

          {/* Kolom 3: Tekstvak voor Doel */}
          <div className="w-20">
            {goalSettings[key]?.enabled && (
              <Input
                type="number"
                min="0"
                max="9"
                value={goalSettings[key]?.target || ''}
                onChange={(e) => onGoalSettingChange(key, 'target', e.target.value)}
                className="text-center rounded-xl border-2"
                style={{ borderColor: 'var(--primary-pink)' }}
                placeholder="0-9"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}