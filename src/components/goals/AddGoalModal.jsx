import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target, Weight, Activity } from "lucide-react";

export default function AddGoalModal({ isOpen, onClose, dogId, snapshot }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);

  const [goalType, setGoalType] = useState('symptoom');
  const [symptomKey, setSymptomKey] = useState('jeuk');
  const [targetValue, setTargetValue] = useState('');
  const [description, setDescription] = useState('');

  // CRITICAL: Hooks MUST be called before any early returns
  const createGoalMutation = useMutation({
    mutationFn: async (goalData) => {
      return await base44.entities.Goal.create(goalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogSnapshot', dogId] });
      handleClose();
    },
    onError: (error) => {
      setError("Er is een fout opgetreden bij het aanmaken van het doel.");
      console.error(error);
    }
  });

  // Now safe to do early returns after all hooks are defined
  if (!snapshot) {
    return null;
  }

  const dog = snapshot.dog;
  const currentState = snapshot.current_state;

  const symptomLabels = {
    jeuk: 'Jeuk',
    roodheid: 'Roodheid',
    schilfers: 'Schilfers',
    stoelgang: 'Stoelgang',
    gedrag: 'Gedrag',
    energie: 'Energie'
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!targetValue) {
      setError("Vul een streefwaarde in");
      return;
    }

    const now = new Date().toISOString();
    let goalData = {
      dog_id: dogId,
      type: goalType,
      start_datum: now.split('T')[0],
      streef_waarde: parseFloat(targetValue),
      status: 'actief',
      notitie: description || ''
    };

    if (goalType === 'symptoom') {
      const currentScore = currentState.symptomen?.[symptomKey]?.current || 5;
      goalData = {
        ...goalData,
        symptom_key: symptomKey,
        doel_omschrijving: description || `${symptomLabels[symptomKey]} verbeteren naar ${targetValue}/10`,
        start_waarde: currentScore
      };
    } else if (goalType === 'gewicht') {
      const currentWeight = currentState.weight?.latest_any?.value || dog?.start_weight_kg || 0;
      goalData = {
        ...goalData,
        doel_omschrijving: description || `Gewicht naar ${targetValue} kg`,
        start_waarde: currentWeight
      };
    }

    createGoalMutation.mutate(goalData);
  };

  const handleClose = () => {
    setGoalType('symptoom');
    setSymptomKey('jeuk');
    setTargetValue('');
    setDescription('');
    setError(null);
    onClose();
  };

  const latestWeight = currentState.weight?.latest_any;
  const currentSymptomScore = currentState.symptomen?.[symptomKey]?.current;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 kwiek-heading text-2xl">
            <Target className="w-6 h-6" style={{ color: 'var(--primary-blue)' }} />
            Nieuw Doel Toevoegen
          </DialogTitle>
          <DialogDescription>
            Stel een nieuw doel in om de voortgang van {dog?.naam} te volgen
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goalType">Type Doel *</Label>
            <Select value={goalType} onValueChange={setGoalType}>
              <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'var(--primary-pink)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="symptoom">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Symptoom
                  </div>
                </SelectItem>
                <SelectItem value="gewicht">
                  <div className="flex items-center gap-2">
                    <Weight className="w-4 h-4" />
                    Gewicht
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {goalType === 'symptoom' && (
            <div className="space-y-2">
              <Label htmlFor="symptomKey">Symptoom *</Label>
              <Select value={symptomKey} onValueChange={setSymptomKey}>
                <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'var(--primary-pink)' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(symptomLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentSymptomScore !== undefined && (
                <p className="text-xs text-gray-500">
                  Huidige score: {currentSymptomScore}/10
                </p>
              )}
            </div>
          )}

          {goalType === 'gewicht' && (
            <div className="bg-gray-50 rounded-xl p-3">
              <Label className="text-xs text-gray-600">Huidig gewicht</Label>
              <p className="text-lg font-bold mt-1" style={{ color: 'var(--primary-blue)' }}>
                {latestWeight?.value || dog?.start_weight_kg || '-'} kg
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="targetValue">
              Streefwaarde * {goalType === 'symptoom' ? '(0-10)' : '(kg)'}
            </Label>
            <Input
              id="targetValue"
              type="number"
              step={goalType === 'gewicht' ? '0.1' : '1'}
              min={goalType === 'symptoom' ? '0' : '0'}
              max={goalType === 'symptoom' ? '10' : undefined}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="rounded-xl border-2"
              style={{ borderColor: 'var(--primary-pink)' }}
              placeholder={goalType === 'symptoom' ? 'Bijv. 3' : 'Bijv. 12.5'}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving (optioneel)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl border-2"
              style={{ borderColor: 'var(--primary-pink)' }}
              placeholder="Extra informatie over dit doel..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              className="rounded-xl"
            >
              Annuleren
            </Button>
            <Button 
              type="submit"
              className="rounded-xl"
              style={{ backgroundColor: 'var(--primary-blue)' }}
              disabled={createGoalMutation.isPending}
            >
              {createGoalMutation.isPending ? 'Opslaan...' : 'Doel Aanmaken'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}