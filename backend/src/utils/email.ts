import * as brevo from '@getbrevo/brevo';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BookingWithDetails } from '../types';

// Configuration de l'API Brevo
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY || ''
);

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

/**
 * Envoie l'email de confirmation de réservation
 */
export const sendConfirmationEmail = async (
  booking: BookingWithDetails
): Promise<void> => {
  const dateFormatted = format(new Date(booking.start_datetime), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
  const modifyUrl = `${process.env.FRONTEND_URL}/booking/${booking.booking_token}`;
  const cancelUrl = `${process.env.FRONTEND_URL}/booking/${booking.booking_token}/cancel`;
  
  const calendar = generateICalEvent(booking);
  
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
        .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #e74c3c; }
        .button { display: inline-block; padding: 12px 24px; background: #e74c3c; color: white; text-decoration: none; border-radius: 4px; margin: 10px 5px; }
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
        </div>
        
        <div class="content">
          <p>Bonjour ${booking.customer_firstname} ${booking.customer_lastname},</p>
          
          <p>Votre réservation d'étude posturale est confirmée !</p>
          
          <div class="info-box">
            <h2>📅 Détails de votre réservation</h2>
            <p><strong>Service :</strong> ${booking.service_name}</p>
            <p><strong>Date et heure :</strong> ${dateFormatted}</p>
            <p><strong>Magasin :</strong> ${booking.store_name}</p>
            <p><strong>Technicien :</strong> ${booking.technician_name || 'À définir'}</p>
            <p><strong>Prix :</strong> ${booking.service_price}€</p>
          </div>
          
          <h2>🎯 Ce qu'il faut apporter</h2>
          <ul>
            <li>Votre vélo (si vous en avez un)</li>
            <li>Votre tenue de cyclisme habituelle</li>
            <li>Vos chaussures de vélo</li>
            <li>Vos cales si vous en utilisez</li>
          </ul>
          
          <h2>📍 Accès au magasin</h2>
          <p>${booking.store_name}</p>
          
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
  
  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = { 
    name: 'Alltricks Bike Fitting', 
    email: process.env.EMAIL_FROM || 'noreply@alltricks.com' 
  };
  sendSmtpEmail.to = [{ email: booking.customer_email, name: `${booking.customer_firstname} ${booking.customer_lastname}` }];
  sendSmtpEmail.subject = `✅ Réservation confirmée - ${booking.service_name}`;
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.attachment = [{
    name: 'reservation.ics',
    content: Buffer.from(generateICalContent(booking)).toString('base64'),
  }];
  
  await apiInstance.sendTransacEmail(sendSmtpEmail);
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
  
  const subject = daysBeforeconst === 2 
    ? '🔔 Rappel : Votre étude posturale dans 2 jours'
    : '⏰ Rappel : Votre étude posturale demain';
  
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
        .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #3498db; }
        .button { display: inline-block; padding: 12px 24px; background: #95a5a6; color: white; text-decoration: none; border-radius: 4px; }
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
          
          <p>Nous vous rappelons que votre étude posturale est prévue ${daysBeforeconst === 2 ? 'après-demain' : 'demain'} :</p>
          
          <div class="info-box">
            <p><strong>Date et heure :</strong> ${dateFormatted}</p>
            <p><strong>Magasin :</strong> ${booking.store_name}</p>
            <p><strong>Service :</strong> ${booking.service_name}</p>
          </div>
          
          <p>N'oubliez pas d'apporter votre vélo, votre tenue et vos chaussures de cyclisme !</p>
          
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
  
  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = { 
    name: 'Alltricks Bike Fitting', 
    email: process.env.EMAIL_FROM || 'noreply@alltricks.com' 
  };
  sendSmtpEmail.to = [{ email: booking.customer_email, name: booking.customer_firstname }];
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;
  
  await apiInstance.sendTransacEmail(sendSmtpEmail);
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
  
  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = { 
    name: 'Alltricks Bike Fitting', 
    email: process.env.EMAIL_FROM || 'noreply@alltricks.com' 
  };
  sendSmtpEmail.to = [{ email: booking.customer_email, name: `${booking.customer_firstname} ${booking.customer_lastname}` }];
  sendSmtpEmail.subject = '❌ Réservation annulée';
  sendSmtpEmail.htmlContent = htmlContent;
  
  await apiInstance.sendTransacEmail(sendSmtpEmail);
};

/**
 * Vérifie la configuration email Brevo
 */
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY non configurée');
      return false;
    }
    // Test simple de connexion à l'API
    const accountApi = new brevo.AccountApi();
    accountApi.setApiKey(brevo.AccountApiApiKeys.apiKey, process.env.BREVO_API_KEY);
    await accountApi.getAccount();
    console.log('✅ Configuration Brevo valide');
    return true;
  } catch (error) {
    console.error('❌ Erreur de configuration Brevo:', error);
    return false;
  }
};
