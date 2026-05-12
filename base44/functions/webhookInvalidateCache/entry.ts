import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Webhook Invalidate Cache Endpoint
 * 
 * Wordt aangeroepen door Base44 webhooks wanneer relevante entiteiten worden gewijzigd.
 * Invalideert de cache voor DogSnapshot zodat verse data wordt opgehaald.
 * 
 * Webhook events die deze functie triggeren:
 * - session.created (status=final)
 * - session.updated (status=final)
 * - weight_measurement.created
 * - weight_measurement.updated
 * - goal.created
 * - goal.updated
 * - dog.updated
 * 
 * In deze implementatie gebruiken we een simpele in-memory cache invalidatie.
 * Voor productie zou je Redis of een andere cache store kunnen gebruiken.
 */

// Simple in-memory cache (voor demo - gebruik Redis in productie)
const snapshotCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minuten

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Valideer webhook signature (belangrijk voor productie)
    const webhookSignature = req.headers.get('X-Base44-Signature');
    // TODO: Implementeer signature validatie
    
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const payload = await req.json();
    
    const { event, entity_type, entity_id, data } = payload;
    
    console.log(`Webhook received: ${event} for ${entity_type} ${entity_id}`);

    // Bepaal welke dog_id geïnvalideerd moet worden
    let dogIdToInvalidate = null;

    if (entity_type === 'Dog') {
      dogIdToInvalidate = entity_id;
    } else if (entity_type === 'Session' || entity_type === 'WeightMeasurement' || entity_type === 'Goal') {
      // Haal dog_id op uit de data
      dogIdToInvalidate = data?.dog_id;
      
      // Als dog_id niet in payload, haal entiteit op
      if (!dogIdToInvalidate) {
        try {
          let entity;
          if (entity_type === 'Session') {
            const sessions = await base44.asServiceRole.entities.Session.list();
            entity = sessions.find(s => s.id === entity_id);
          } else if (entity_type === 'WeightMeasurement') {
            const weights = await base44.asServiceRole.entities.WeightMeasurement.list();
            entity = weights.find(w => w.id === entity_id);
          } else if (entity_type === 'Goal') {
            const goals = await base44.asServiceRole.entities.Goal.list();
            entity = goals.find(g => g.id === entity_id);
          }
          dogIdToInvalidate = entity?.dog_id;
        } catch (error) {
          console.error('Error fetching entity for dog_id:', error);
        }
      }
    }

    if (dogIdToInvalidate) {
      // Invalideer cache voor deze hond
      const cacheKey = `dog_snapshot_${dogIdToInvalidate}`;
      snapshotCache.delete(cacheKey);
      
      console.log(`Cache invalidated for dog ${dogIdToInvalidate}`);
      
      return Response.json({
        success: true,
        message: 'Cache invalidated',
        dog_id: dogIdToInvalidate,
        cache_key: cacheKey
      });
    } else {
      console.warn('No dog_id found in webhook payload, skipping cache invalidation');
      return Response.json({
        success: false,
        message: 'No dog_id found in payload'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
    return Response.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
});

/**
 * Helper functie om snapshot uit cache op te halen of te genereren
 * Deze kan worden gebruikt in getDogSnapshot.js
 */
export function getCachedSnapshot(dogId) {
  const cacheKey = `dog_snapshot_${dogId}`;
  const cached = snapshotCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  
  return null;
}

export function setCachedSnapshot(dogId, data) {
  const cacheKey = `dog_snapshot_${dogId}`;
  snapshotCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
}