import React, { useState, useEffect } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Share2, Copy, RefreshCw, CheckCircle, AlertCircle, Info } from "lucide-react";

export default function ShareProfileModal({ isOpen, onClose, dog }) {
  const queryClient = useQueryClient();
  const [gastpasPassword, setGastpasPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [generatedSlug, setGeneratedSlug] = useState(dog?.gastpas_slug || null);

  // Update local state when dog prop changes
  useEffect(() => {
    setGeneratedSlug(dog?.gastpas_slug || null);
  }, [dog]);

  // Generate random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGastpasPassword(password);
  };

  // Get gastpas URL
  const getGastpasUrl = () => {
    const slug = generatedSlug || dog?.gastpas_slug;
    if (!slug) return '';
    return `${window.location.origin}/gastpas/${slug}`;
  };

  // Copy URL to clipboard
  const copyToClipboard = () => {
    const url = getGastpasUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Copy ALL info to clipboard - NEW FEATURE
  const copyAllToClipboard = () => {
    const url = getGastpasUrl();
    if (!url || !gastpasPassword) return;

    const textToCopy = `Gastpas Link
${url}

Wachtwoord
${gastpasPassword}

Stuur deze link en het wachtwoord naar ${dog?.baasje_email || 'het baasje'} via jouw eigen email of berichtendienst.`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const updateCredentialsMutation = useMutation({
    mutationFn: async (data) => {
      // Generate slug if not exists
      let slug = generatedSlug || dog?.gastpas_slug;
      if (!slug) {
        slug = crypto.randomUUID();
      }

      // Update dog with credentials
      await base44.entities.Dog.update(dog.id, {
        gastpas_slug: slug,
        gastpas_wachtwoord: data.gastpasPassword
      });

      return { slug, password: data.gastpasPassword };
    },
    onSuccess: (data) => {
      console.log('Credentials updated:', data);
      setGeneratedSlug(data.slug);
      setSuccess(true);
      setError(null);
      
      queryClient.invalidateQueries({ queryKey: ['dogSnapshot', dog.id] });
      queryClient.invalidateQueries({ queryKey: ['dog', dog.id] });
    },
    onError: (error) => {
      console.error('Update credentials error:', error);
      setError("Er is een fout opgetreden bij het aanmaken van de gastpas.");
      setSuccess(false);
    }
  });

  const handleGenerate = (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!gastpasPassword) {
      setError("Vul een wachtwoord in of genereer er een");
      return;
    }

    updateCredentialsMutation.mutate({
      gastpasPassword
    });
  };

  const handleClose = () => {
    setGastpasPassword('');
    setError(null);
    setSuccess(false);
    setCopied(false);
    setCopiedAll(false);
    onClose();
  };

  const hasCredentials = generatedSlug && gastpasPassword;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 kwiek-heading text-2xl">
            <Share2 className="w-6 h-6" style={{ color: 'var(--primary-blue)' }} />
            Deel Profiel met Baasje
          </DialogTitle>
          <DialogDescription>
            Genereer een beveiligde link en wachtwoord voor {dog?.naam}
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-blue-50 border-blue-200">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            <strong>Let op:</strong> Kopieer de link en het wachtwoord en stuur deze via email, SMS of WhatsApp naar het baasje.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Gastpas link en wachtwoord zijn succesvol aangemaakt!
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleGenerate} className="space-y-4">
          {/* Password Generation */}
          <div className="space-y-2">
            <Label htmlFor="gastpasPassword">Wachtwoord *</Label>
            <div className="flex gap-2">
              <Input
                id="gastpasPassword"
                type="text"
                value={gastpasPassword}
                onChange={(e) => setGastpasPassword(e.target.value)}
                className="rounded-xl border-2 flex-1"
                style={{ borderColor: 'var(--primary-pink)' }}
                placeholder="Typ zelf of klik op 'Genereer' →"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={generatePassword}
                className="rounded-xl border-2"
                style={{ borderColor: 'var(--primary-blue)', color: 'var(--primary-blue)' }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Genereer
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Je kunt zelf een wachtwoord kiezen of er automatisch één genereren
            </p>
          </div>

          {/* Generate/Update Button */}
          {!hasCredentials && (
            <Button 
              type="submit"
              className="w-full rounded-xl"
              style={{ backgroundColor: 'var(--primary-blue)' }}
              disabled={updateCredentialsMutation.isPending || !gastpasPassword}
            >
              {updateCredentialsMutation.isPending ? 'Aanmaken...' : 'Gastpas Aanmaken'}
            </Button>
          )}

          {/* Show credentials after generation */}
          {hasCredentials && (
            <div className="space-y-4 pt-4 border-t-2" style={{ borderColor: 'var(--primary-pink)' }}>
              
              {/* COPY ALL BUTTON - PROMINENT */}
              <Button
                type="button"
                onClick={copyAllToClipboard}
                className="w-full rounded-xl h-12 text-base font-semibold"
                style={{ backgroundColor: copiedAll ? '#10b981' : 'var(--primary-blue)' }}
              >
                {copiedAll ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Gekopieerd!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5 mr-2" />
                    Kopieer Link & Wachtwoord
                  </>
                )}
              </Button>

              <div className="space-y-2 p-4 bg-gray-50 rounded-xl border-2" style={{ borderColor: 'var(--primary-pink)' }}>
                <Label className="text-sm font-semibold">Gastpas Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={getGastpasUrl()}
                    readOnly
                    className="rounded-xl border-2 text-sm"
                    style={{ borderColor: 'var(--primary-pink)' }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copyToClipboard}
                    className="rounded-xl"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2 p-4 bg-gray-50 rounded-xl border-2" style={{ borderColor: 'var(--primary-pink)' }}>
                <Label className="text-sm font-semibold">Wachtwoord</Label>
                <Input
                  value={gastpasPassword}
                  readOnly
                  className="rounded-xl border-2 text-lg font-bold text-center"
                  style={{ borderColor: 'var(--primary-pink)', color: 'var(--primary-blue)' }}
                />
              </div>

              <Alert className="bg-yellow-50 border-yellow-200">
                <Info className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 text-sm">
                  Stuur deze link en het wachtwoord naar <strong>{dog?.baasje_email || 'het baasje'}</strong> via jouw eigen email of berichtendienst.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              className="rounded-xl"
            >
              Sluiten
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}