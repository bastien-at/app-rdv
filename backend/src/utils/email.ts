import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BookingWithDetails } from '../types';

// Module d'envoi d'emails via Brevo
// Helper pour envoyer des emails via l'API Brevo directement (bypass SDK)
const sendBrevoEmail = async (payload: any) => {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  
  if (!apiKey) {
    throw new Error('BREVO_API_KEY non configurée');
  }

  console.log(`[Debug Brevo] Utilisation fetch avec clé: ${apiKey.substring(0, 5)}...`);

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return { body: data };
};

export const sendReceptionReportEmail = async (report: any): Promise<void> => {
  const dateFormatted = format(new Date(report.start_datetime), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #005162; color: white; padding: 20px; text-align: center; }
        .content { background: #f5f7fa; padding: 30px; }
        .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #e0e6ed; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Votre état des lieux</h1>
        </div>
        <div class="content">
          <p>Bonjour ${report.customer_firstname} ${report.customer_lastname},</p>
          <p>Vous trouverez ci-dessous le compte rendu de l'intervention réalisée sur votre vélo.</p>

          <div class="info-box">
            <h2>Détails du rendez-vous</h2>
            <p><strong>Date et heure :</strong> ${dateFormatted}</p>
            <p><strong>Magasin :</strong> ${report.store_name}</p>
            <p><strong>Service :</strong> ${report.service_name}</p>
            ${report.technician_name ? `<p><strong>Technicien :</strong> ${report.technician_name}</p>` : ''}
          </div>

          <div class="info-box">
            <h2>Détails de l'intervention</h2>
            ${report.work_performed ? `<p><strong>Travaux effectués :</strong><br/>${report.work_performed.replace(/\n/g, '<br/>')}</p>` : ''}
            ${report.parts_replaced ? `<p><strong>Pièces remplacées :</strong><br/>${report.parts_replaced.replace(/\n/g, '<br/>')}</p>` : ''}
            ${report.recommendations ? `<p><strong>Recommandations :</strong><br/>${report.recommendations.replace(/\n/g, '<br/>')}</p>` : ''}
          </div>

          ${(report.total_cost || report.labor_cost || report.parts_cost) ? `
          <div class="info-box">
            <h2>Récapitulatif tarifaire</h2>
            ${report.labor_cost ? `<p><strong>Main d'œuvre :</strong> ${report.labor_cost.toFixed(2)}€</p>` : ''}
            ${report.parts_cost ? `<p><strong>Pièces :</strong> ${report.parts_cost.toFixed(2)}€</p>` : ''}
            ${report.total_cost ? `<p><strong>Total TTC :</strong> ${report.total_cost.toFixed(2)}€</p>` : ''}
          </div>
          ` : ''}

          <p>Merci pour votre confiance et à bientôt en magasin.</p>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          <p>© ${new Date().getFullYear()} Alltricks - Tous droits réservés</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const payload = {
    sender: {
      name: 'Alltricks Bike Fitting',
      email: process.env.EMAIL_FROM || 'noreply@alltricks.com',
    },
    to: [
      {
        email: report.customer_email,
        name: `${report.customer_firstname} ${report.customer_lastname}`,
      },
    ],
    subject: `Compte rendu d'intervention - ${report.service_name}`,
    htmlContent,
  };

  console.log(`[Email] Tentative d'envoi de PV d'intervention à ${report.customer_email}`);
  try {
    const data = await sendBrevoEmail(payload);
    console.log(`[Email] PV d'intervention envoyé. Message ID: ${(data.body as any).messageId}`);
  } catch (error) {
    console.error('[Email] Erreur lors de l\'envoi du PV d\'intervention:', error);
  }
};

/**
 * Génère le contenu iCal pour une réservation
 */
const generateICalContent = (booking: BookingWithDetails): string => {
  const startDate = new Date(booking.start_datetime);
  const endDate = new Date(booking.end_datetime);
  
  const formatICalDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Alltricks//Bike Fitting//FR
BEGIN:VEVENT
UID:${booking.booking_token}@alltricks.com
DTSTART:${formatICalDate(startDate)}
DTEND:${formatICalDate(endDate)}
SUMMARY:${booking.service_type === 'fitting' ? 'Étude posturale' : 'Atelier mécanique'} - ${booking.service_name}
DESCRIPTION:Réservation ${booking.service_type === 'fitting' ? "d'étude posturale" : "d'atelier"} ${booking.service_name}\n\nMagasin: ${booking.store_name}\nTechnicien: ${booking.technician_name || 'À définir'}
LOCATION:${booking.store_name}
URL:${process.env.FRONTEND_URL}/booking/${booking.booking_token}
END:VEVENT
END:VCALENDAR`;
};

// Construit l'URL Google Maps cliquable pour le magasin
const getGoogleMapsUrl = (booking: BookingWithDetails): string => {
  const addressParts: string[] = [];

  if ((booking as any).store_address) {
    addressParts.push((booking as any).store_address);
  }
  if ((booking as any).store_postal_code || (booking as any).store_city) {
    addressParts.push(`${(booking as any).store_postal_code || ''} ${(booking as any).store_city || ''}`.trim());
  }

  if (!addressParts.length && booking.store_name) {
    addressParts.push(booking.store_name);
  }

  const query = encodeURIComponent(addressParts.join(', '));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

// Construit l'URL "Ajouter à Google Calendar" (l'ICS reste en pièce jointe pour les autres agendas)
const getGoogleCalendarUrl = (booking: BookingWithDetails): string => {
  const start = new Date(booking.start_datetime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const end = new Date(booking.end_datetime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const title = `${booking.service_type === 'fitting' ? 'Étude posturale' : 'Atelier'} - ${booking.service_name}`;

  const detailsLines = [
    `Magasin : ${booking.store_name}`,
    booking.technician_name ? `Technicien : ${booking.technician_name}` : undefined,
    `${process.env.FRONTEND_URL}/booking/${booking.booking_token}`,
  ].filter(Boolean);

  const locationParts: string[] = [];
  if ((booking as any).store_address) {
    locationParts.push((booking as any).store_address);
  }
  if ((booking as any).store_postal_code || (booking as any).store_city) {
    locationParts.push(`${(booking as any).store_postal_code || ''} ${(booking as any).store_city || ''}`.trim());
  }

  const location = locationParts.length ? locationParts.join(', ') : booking.store_name || '';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    details: detailsLines.join('\n'),
    location,
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
};

/**
 * Envoie l'email de confirmation de demande de réservation (statut pending)
 */
export const sendBookingRequestEmail = async (
  booking: BookingWithDetails
): Promise<void> => {
  const dateFormatted = format(new Date(booking.start_datetime), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
  const cancelUrl = `${process.env.FRONTEND_URL}/booking/${booking.booking_token}/cancel`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a1a1a; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #f39c12; }
        .button { display: inline-block; padding: 12px 24px; background: #e74c3c; color: white; text-decoration: none; border-radius: 4px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        h1 { margin: 0; }
        h2 { color: #1a1a1a; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏳ Demande reçue</h1>
        </div>
        
        <div class="content">
          <p>Bonjour ${booking.customer_firstname} ${booking.customer_lastname},</p>
          
          <p>Nous avons bien reçu votre demande de réservation.</p>
          <p>Elle est actuellement <strong>en attente de validation</strong> par notre équipe.</p>
          
          <div class="info-box">
            <h2>📅 Détails de la demande</h2>
            <p><strong>Service :</strong> ${booking.service_name}</p>
            <p><strong>Date et heure :</strong> ${dateFormatted}</p>
            <p><strong>Magasin :</strong> ${booking.store_name}</p>
            <p><strong>Technicien :</strong> ${booking.technician_name || 'À définir'}</p>
            <p><strong>Prix :</strong> ${booking.service_price}€</p>
          </div>
          
          <p>Vous recevrez un nouvel email dès que votre réservation sera confirmée.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${cancelUrl}" class="button" style="background: #95a5a6;">Annuler ma demande</a>
          </div>
        </div>
        
        <div class="footer">
          <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          <p>© ${new Date().getFullYear()} Alltricks - Tous droits réservés</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const payload = {
    sender: { 
      name: 'Alltricks Bike Fitting', 
      email: process.env.EMAIL_FROM || 'noreply@alltricks.com' 
    },
    to: [{ email: booking.customer_email, name: `${booking.customer_firstname} ${booking.customer_lastname}` }],
    subject: `⏳ Demande de réservation reçue - ${booking.service_name}`,
    htmlContent: htmlContent
  };
  
  console.log(`[Email] Tentative d'envoi de réception demande à ${booking.customer_email}`);
  try {
    const data = await sendBrevoEmail(payload);
    console.log(`[Email] Notification demande reçue envoyée. Message ID: ${(data.body as any).messageId}`);
  } catch (error) {
    console.error(`[Email] Erreur lors de l'envoi de notification demande:`, error);
    // On ne throw pas l'erreur pour ne pas bloquer le flow côté client si l'email fail
  }
};

/**
 * Envoie l'email de confirmation de réservation
 */
export const sendConfirmationEmail = async (
  booking: BookingWithDetails
): Promise<void> => {
  const dateFormatted = format(new Date(booking.start_datetime), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
  const modifyUrl = `${process.env.FRONTEND_URL}/booking/${booking.booking_token}`;
  const cancelUrl = `${process.env.FRONTEND_URL}/booking/${booking.booking_token}/cancel`;
  const isFitting = booking.service_type === 'fitting';

  const storeAddressLine = (booking as any).store_address
    ? `${(booking as any).store_address}${(booking as any).store_postal_code || (booking as any).store_city ? ', ' : ''}${(booking as any).store_postal_code || ''} ${(booking as any).store_city || ''}`.trim()
    : '';

  const mapsUrl = getGoogleMapsUrl(booking);
  const googleCalUrl = getGoogleCalendarUrl(booking);
  
  const calendar = generateICalContent(booking);
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #005162; color: white; padding: 20px; text-align: center; }
        .content { background: #f5f7fa; padding: 30px; }
        .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #e0e6ed; }
        .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; letter-spacing: .03em; text-transform: uppercase; }
        .pill-fitting { background: #e3f2fd; color: #005162; }
        .pill-workshop { background: #fff4e5; color: #b55900; }
        .button { display: inline-block; padding: 12px 24px; background: #005162; color: white; text-decoration: none; border-radius: 999px; margin: 6px 4px; font-weight: 600; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        h1 { margin: 0; }
        h2 { color: #1a1a1a; }
        ul { padding-left: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Réservation confirmée</h1>
          <div style="margin-top:8px;">
            <span class="pill ${isFitting ? 'pill-fitting' : 'pill-workshop'}">${isFitting ? 'Étude posturale' : 'Atelier'}</span>
          </div>
        </div>
        
        <div class="content">
          <p>Bonjour ${booking.customer_firstname} ${booking.customer_lastname},</p>
          
          <p>Votre réservation ${isFitting ? "d'étude posturale" : "d'atelier"} est confirmée !</p>
          
          <div class="info-box">
            <h2>📅 Détails de votre réservation</h2>
            <p><strong>Service :</strong> ${booking.service_name}</p>
            <p><strong>Date et heure :</strong> ${dateFormatted}</p>
            <p><strong>Magasin :</strong> ${booking.store_name}</p>
            <p><strong>Technicien :</strong> ${booking.technician_name || 'À définir'}</p>
            <p><strong>Prix :</strong> ${booking.service_price}€</p>
          </div>
          
          <h2>🎯 Ce qu'il faut apporter</h2>
          ${isFitting
            ? `<ul>
                 <li>Votre vélo (si vous en avez un)</li>
                 <li>Votre tenue de cyclisme habituelle</li>
                 <li>Vos chaussures de vélo</li>
                 <li>Vos cales/pédales automatiques si vous en utilisez</li>
               </ul>`
            : `<ul>
                 <li>Le vélo concerné par l'intervention</li>
                 <li>Votre clé d'antivol (si le vélo est attaché)</li>
                 <li>Le ticket de caisse ou la facture en cas de prise en charge garantie</li>
                 <li>Tout élément utile au diagnostic (ancien devis, photos, etc.)</li>
               </ul>`
          }
          
          <h2>📍 Accès au magasin</h2>
          <p><strong>${booking.store_name}</strong></p>
          ${storeAddressLine ? `<p>${storeAddressLine}</p>` : ''}
          <p>
            <a href="${mapsUrl}" style="color:#005162;font-weight:600;text-decoration:underline;" target="_blank" rel="noopener noreferrer">
              Voir le magasin sur Google Maps
            </a>
          </p>

          <h2>🗓 Ajouter à votre calendrier</h2>
          <div style="text-align: center; margin: 10px 0 24px 0;">
            <a href="${googleCalUrl}" class="button" target="_blank" rel="noopener noreferrer">Ajouter à Google Calendar</a>
          </div>
          <p style="font-size: 12px; color: #666; margin-top: -10px;">
            Un fichier <strong>.ics</strong> est joint à cet email pour ajouter facilement le rendez-vous à votre calendrier (Outlook, Apple Calendar, etc.).
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${modifyUrl}" class="button">Modifier ma réservation</a>
            <a href="${cancelUrl}" class="button" style="background: #95a5a6;">Annuler</a>
          </div>
          
          <p style="font-size: 12px; color: #666;">
            Vous recevrez un rappel 2 jours et 1 jour avant votre rendez-vous.
          </p>
        </div>
        
        <div class="footer">
          <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          <p>© ${new Date().getFullYear()} Alltricks - Tous droits réservés</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const payload = {
    sender: { 
      name: 'Alltricks Bike Fitting', 
      email: process.env.EMAIL_FROM || 'noreply@alltricks.com' 
    },
    to: [{ email: booking.customer_email, name: `${booking.customer_firstname} ${booking.customer_lastname}` }],
    subject: `✅ Réservation confirmée - ${booking.service_name}`,
    htmlContent: htmlContent,
    attachment: [{
      name: 'reservation.ics',
      content: Buffer.from(generateICalContent(booking)).toString('base64'),
    }]
  };
  
  console.log(`[Email] Tentative d'envoi de confirmation à ${booking.customer_email}`);
  try {
    const data = await sendBrevoEmail(payload);
    console.log(`[Email] Confirmation envoyée avec succès. Message ID: ${(data.body as any).messageId}`);
  } catch (error) {
    console.error(`[Email] Erreur lors de l'envoi de confirmation:`, error);
    throw error;
  }
};

/**
 * Envoie un email de rappel
 */
export const sendReminderEmail = async (
  booking: BookingWithDetails,
  daysBeforeconst: number
): Promise<void> => {
  const dateFormatted = format(new Date(booking.start_datetime), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
  const cancelUrl = `${process.env.FRONTEND_URL}/booking/${booking.booking_token}/cancel`;
  const isFitting = booking.service_type === 'fitting';
  const mapsUrl = getGoogleMapsUrl(booking);
  
  const subject = daysBeforeconst === 2 
    ? `🔔 Rappel : Votre ${isFitting ? "étude posturale" : "rendez-vous atelier"} dans 2 jours`
    : `⏰ Rappel : Votre ${isFitting ? "étude posturale" : "rendez-vous atelier"} demain`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #005162; color: white; padding: 20px; text-align: center; }
        .content { background: #f5f7fa; padding: 30px; }
        .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #e0e6ed; }
        .button { display: inline-block; padding: 12px 24px; background: #95a5a6; color: white; text-decoration: none; border-radius: 999px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${daysBeforeconst === 2 ? '🔔' : '⏰'} Rappel de rendez-vous</h1>
        </div>
        
        <div class="content">
          <p>Bonjour ${booking.customer_firstname},</p>
          
          <p>Nous vous rappelons que votre ${isFitting ? "étude posturale" : "rendez-vous atelier"} est prévu ${daysBeforeconst === 2 ? 'après-demain' : 'demain'} :</p>
          
          <div class="info-box">
            <p><strong>Date et heure :</strong> ${dateFormatted}</p>
            <p><strong>Magasin :</strong> ${booking.store_name}</p>
            <p><strong>Service :</strong> ${booking.service_name}</p>
          </div>
          
          <p>
            ${isFitting
              ? "N'oubliez pas d'apporter votre vélo (si vous en avez un), votre tenue et vos chaussures de cyclisme."
              : "Merci d'apporter le vélo concerné, ainsi que votre clé d'antivol et vos justificatifs si une prise en charge garantie est nécessaire."
            }
          </p>

          <p>
            <a href="${mapsUrl}" style="color:#005162;font-weight:600;text-decoration:underline;" target="_blank" rel="noopener noreferrer">
              Voir le magasin sur Google Maps
            </a>
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${cancelUrl}" class="button">Annuler ma réservation</a>
          </div>
          
          <p>À très bientôt !</p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} Alltricks - Tous droits réservés</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const payload = {
    sender: { 
      name: 'Alltricks Bike Fitting', 
      email: process.env.EMAIL_FROM || 'noreply@alltricks.com' 
    },
    to: [{ email: booking.customer_email, name: booking.customer_firstname }],
    subject: subject,
    htmlContent: htmlContent
  };
  
  console.log(`[Email] Tentative d'envoi de rappel (${daysBeforeconst}j) à ${booking.customer_email}`);
  try {
    const data = await sendBrevoEmail(payload);
    console.log(`[Email] Rappel envoyé avec succès. Message ID: ${(data.body as any).messageId}`);
  } catch (error) {
    console.error(`[Email] Erreur lors de l'envoi de rappel:`, error);
    throw error;
  }
};

/**
 * Envoie un email d'annulation
 */
export const sendCancellationEmail = async (
  booking: BookingWithDetails
): Promise<void> => {
  const dateFormatted = format(new Date(booking.start_datetime), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
  const bookAgainUrl = `${process.env.FRONTEND_URL}/stores/${booking.store_id}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a1a1a; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #95a5a6; }
        .button { display: inline-block; padding: 12px 24px; background: #e74c3c; color: white; text-decoration: none; border-radius: 4px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Réservation annulée</h1>
        </div>
        
        <div class="content">
          <p>Bonjour ${booking.customer_firstname} ${booking.customer_lastname},</p>
          
          <p>Votre réservation a bien été annulée :</p>
          
          <div class="info-box">
            <p><strong>Service :</strong> ${booking.service_name}</p>
            <p><strong>Date et heure :</strong> ${dateFormatted}</p>
            <p><strong>Magasin :</strong> ${booking.store_name}</p>
          </div>
          
          <p>Nous espérons vous revoir bientôt !</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${bookAgainUrl}" class="button">Prendre un nouveau rendez-vous</a>
          </div>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} Alltricks - Tous droits réservés</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const payload = {
    sender: { 
      name: 'Alltricks Bike Fitting', 
      email: process.env.EMAIL_FROM || 'noreply@alltricks.com' 
    },
    to: [{ email: booking.customer_email, name: `${booking.customer_firstname} ${booking.customer_lastname}` }],
    subject: '❌ Réservation annulée',
    htmlContent: htmlContent
  };
  
  console.log(`[Email] Tentative d'envoi d'annulation à ${booking.customer_email}`);
  try {
    const data = await sendBrevoEmail(payload);
    console.log(`[Email] Annulation envoyée avec succès. Message ID: ${(data.body as any).messageId}`);
  } catch (error) {
    console.error(`[Email] Erreur lors de l'envoi d'annulation:`, error);
    throw error;
  }
};

/**
 * Envoie un email de réinitialisation de mot de passe
 */
export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string
): Promise<void> => {
  const resetUrl = `${process.env.FRONTEND_URL}/admin/reset-password/${resetToken}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a1a1a; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .button { display: inline-block; padding: 12px 24px; background: #e74c3c; color: white; text-decoration: none; border-radius: 4px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 Réinitialisation de mot de passe</h1>
        </div>
        
        <div class="content">
          <p>Bonjour,</p>
          
          <p>Vous avez demandé la réinitialisation de votre mot de passe administrateur.</p>
          <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
          </div>
          
          <p>Ce lien est valide pendant 1 heure.</p>
          <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
        </div>
        
        <div class="footer">
          <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          <p>© ${new Date().getFullYear()} Alltricks - Tous droits réservés</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const payload = {
    sender: { 
      name: 'Alltricks Admin', 
      email: process.env.EMAIL_FROM || 'noreply@alltricks.com' 
    },
    to: [{ email: email }],
    subject: '🔒 Réinitialisation de votre mot de passe',
    htmlContent: htmlContent
  };
  
  console.log(`[Email] Envoi email reset password à ${email}`);
  try {
    const data = await sendBrevoEmail(payload);
    console.log(`[Email] Email reset password envoyé. ID: ${(data.body as any).messageId}`);
  } catch (error) {
    console.error(`[Email] Erreur envoi email reset password:`, error);
    throw error;
  }
};

/**
 * Vérifie la configuration email Brevo
 */
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.error('❌ BREVO_API_KEY non configurée');
      return false;
    }
    
    const response = await fetch('https://api.brevo.com/v3/account', {
      headers: {
        'api-key': apiKey,
        'accept': 'application/json'
      }
    });

    if (response.ok) {
      console.log('✅ Configuration Brevo valide');
      return true;
    } else {
      console.error('❌ Erreur configuration Brevo:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur de configuration Brevo:', error);
    return false;
  }
};
