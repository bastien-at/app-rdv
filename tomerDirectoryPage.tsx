[1mdiff --git a/backend/src/middleware/validation.ts b/backend/src/middleware/validation.ts[m
[1mindex 14c06ec..a7a38e0 100644[m
[1m--- a/backend/src/middleware/validation.ts[m
[1m+++ b/backend/src/middleware/validation.ts[m
[36m@@ -41,7 +41,7 @@[m [mexport const validateCreateBooking = [[m
   body('customer_email')[m
     .trim()[m
     .isEmail().withMessage('Email invalide')[m
[31m-    .normalizeEmail(),[m
[32m+[m[32m    .normalizeEmail({ gmail_remove_dots: false }),[m
   body('customer_phone')[m
     .trim()[m
     .matches(/^(\+33|0)[1-9](\d{2}){4}$/).withMessage('Numéro de téléphone français invalide'),[m
[36m@@ -60,7 +60,7 @@[m [mexport const validateUpdateBooking = [[m
   body('start_datetime').optional().isISO8601().withMessage('Date/heure invalide'),[m
   body('customer_firstname').optional().trim().isLength({ max: 100 }),[m
   body('customer_lastname').optional().trim().isLength({ max: 100 }),[m
[31m-  body('customer_email').optional().trim().isEmail().normalizeEmail(),[m
[32m+[m[32m  body('customer_email').optional().trim().isEmail().normalizeEmail({ gmail_remove_dots: false }),[m
   body('customer_phone').optional().trim().matches(/^(\+33|0)[1-9](\d{2}){4}$/),[m
   body('customer_data').optional().isObject(),[m
   validate,[m
[36m@@ -80,7 +80,7 @@[m [mexport const validateAvailability = [[m
  * Validations pour la connexion admin[m
  */[m
 export const validateAdminLogin = [[m
[31m-  body('email').trim().isEmail().withMessage('Email invalide').normalizeEmail(),[m
[32m+[m[32m  body('email').trim().isEmail().withMessage('Email invalide').normalizeEmail({ gmail_remove_dots: false }),[m
   body('password').notEmpty().withMessage('Mot de passe requis'),[m
   validate,[m
 ];[m
[1mdiff --git a/backend/src/routes/adminRoutes.ts b/backend/src/routes/adminRoutes.ts[m
[1mindex b2d221d..ef6a841 100644[m
[1m--- a/backend/src/routes/adminRoutes.ts[m
[1m+++ b/backend/src/routes/adminRoutes.ts[m
[36m@@ -62,7 +62,7 @@[m [mrouter.post('/bookings/:id/reception-report', saveReceptionReport);[m
 router.get('/stores/:storeId/availability-blocks', requireStoreAccess, getStoreAvailabilityBlocks);[m
 [m
 // POST /api/admin/availability-blocks - Créer un blocage[m
[31m-router.post('/availability-blocks', validateCreateBlock, createAvailabilityBlock);[m
[32m+[m[32mrouter.post('/availability-blocks', requireStoreAccess, validateCreateBlock, createAvailabilityBlock);[m
 [m
 // DELETE /api/admin/availability-blocks/:id - Supprimer un blocage[m
 router.delete('/availability-blocks/:id', deleteAvailabilityBlock);[m
[1mdiff --git a/backend/src/routes/customerDirectoryRoutes.ts b/backend/src/routes/customerDirectoryRoutes.ts[m
[1mindex 5cd995c..8e2690a 100644[m
[1m--- a/backend/src/routes/customerDirectoryRoutes.ts[m
[1m+++ b/backend/src/routes/customerDirectoryRoutes.ts[m
[36m@@ -7,15 +7,15 @@[m [mimport {[m
   updateCustomer,[m
   deleteCustomer[m
 } from '../controllers/customerDirectoryController';[m
[31m-import { authenticateAdmin } from '../middleware/auth';[m
[32m+[m[32mimport { authenticateAdmin, requireStoreAccess } from '../middleware/auth';[m
 [m
 const router = Router();[m
 [m
 // Routes nécessitant une authentification admin[m
[31m-router.get('/stores/:store_id/customers', authenticateAdmin, getCustomers);[m
[31m-router.get('/stores/:store_id/customers/search', authenticateAdmin, searchCustomers);[m
[32m+[m[32mrouter.get('/stores/:storeId/customers', authenticateAdmin, requireStoreAccess, getCustomers);[m
[32m+[m[32mrouter.get('/stores/:storeId/customers/search', authenticateAdmin, requireStoreAccess, searchCustomers);[m
 [m
[31m-router.post('/stores/:store_id/customers', authenticateAdmin, [[m
[32m+[m[32mrouter.post('/stores/:storeId/customers', authenticateAdmin, requireStoreAccess, [[m
   body('firstname')[m
     .trim()[m
     .isLength({ min: 1, max: 100 })[m
[1mdiff --git a/backend/src/utils/availability.ts b/backend/src/utils/availability.ts[m
[1mindex 6e6dab6..a87a139 100644[m
[1m--- a/backend/src/utils/availability.ts[m
[1m+++ b/backend/src/utils/availability.ts[m
[36m@@ -37,8 +37,9 @@[m [mexport const calculateAvailableSlots = async ([m
   const dayName = format(date, 'EEEE').toLowerCase() as keyof typeof store.opening_hours;[m
   const daySchedule: DaySchedule = store.opening_hours[dayName];[m
   [m
[31m-  if (!daySchedule || daySchedule.closed) {[m
[31m-    return []; // Magasin fermé ce jour[m
[32m+[m[32m  // Bloquer systématiquement les dimanches[m
[32m+[m[32m  if (date.getDay() === 0 || !daySchedule || daySchedule.closed) {[m
[32m+[m[32m    return []; // Magasin fermé ou dimanche[m
   }[m
   [m
   // 4. Générer tous les créneaux possibles[m
[1mdiff --git a/backend/src/utils/email.ts b/backend/src/utils/email.ts[m
[1mindex 2bc2cea..32fa6e8 100644[m
[1m--- a/backend/src/utils/email.ts[m
[1m+++ b/backend/src/utils/email.ts[m
[36m@@ -6,7 +6,7 @@[m [mimport { BookingWithDetails } from '../types';[m
 // Helper pour envoyer des emails via l'API Brevo directement (bypass SDK)[m
 const sendBrevoEmail = async (payload: any) => {[m
   const apiKey = (process.env.BREVO_API_KEY || '').trim();[m
[31m-  [m
[32m+[m
   if (!apiKey) {[m
     throw new Error('BREVO_API_KEY non configurée');[m
   }[m
[36m@@ -95,7 +95,7 @@[m [mexport const sendReceptionReportEmail = async (report: any): Promise<void> => {[m
 [m
   const payload = {[m
     sender: {[m
[31m-      name: 'Alltricks Bike Fitting',[m
[32m+[m[32m      name: 'Alltricks Services',[m
       email: process.env.EMAIL_FROM || 'noreply@alltricks.com',[m
     },[m
     to: [[m
[36m@@ -123,14 +123,14 @@[m [mexport const sendReceptionReportEmail = async (report: any): Promise<void> => {[m
 const generateICalContent = (booking: BookingWithDetails): string => {[m
   const startDate = new Date(booking.start_datetime);[m
   const endDate = new Date(booking.end_datetime);[m
[31m-  [m
[32m+[m
   const formatICalDate = (date: Date) => {[m
     return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';[m
   };[m
[31m-  [m
[32m+[m
   return `BEGIN:VCALENDAR[m
 VERSION:2.0[m
[31m-PRODID:-//Alltricks//Bike Fitting//FR[m
[32m+[m[32mPRODID:-//Alltricks//Services//FR[m
 BEGIN:VEVENT[m
 UID:${booking.booking_token}@alltricks.com[m
 DTSTART:${formatICalDate(startDate)}[m
[36m@@ -203,7 +203,7 @@[m [mexport const sendBookingRequestEmail = async ([m
 ): Promise<void> => {[m
   const dateFormatted = format(new Date(booking.start_datetime), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });[m
   const cancelUrl = `${process.env.FRONTEND_URL}/booking/${booking.booking_token}/cancel`;[m
[31m-  [m
[32m+[m
   const htmlContent = `[m
     <!DOCTYPE html>[m
     <html>[m
[36m@@ -257,17 +257,17 @@[m [mexport const sendBookingRequestEmail = async ([m
     </body>[m
     </html>[m
   `;[m
[31m-  [m
[32m+[m
   const payload = {[m
[31m-    sender: { [m
[31m-      name: 'Alltricks Bike Fitting', [m
[31m-      email: process.env.EMAIL_FROM || 'noreply@alltricks.com' [m
[32m+[m[32m    sender: {[m
[32m+[m[32m      name: 'Alltricks Services',[m
[32m+[m[32m      email: process.env.EMAIL_FROM || 'noreply@alltricks.com'[m
     },[m
     to: [{ email: booking.customer_email, name: `${booking.customer_firstname} ${booking.customer_lastname}` }],[m
     subject: `⏳ Demande de réservation reçue - ${booking.service_name}`,[m
     htmlContent: htmlContent[m
   };[m
[31m-  [m
[32m+[m
   console.log(`[Email] Tentative d'envoi de réception demande à ${booking.customer_email}`);[m
   try {[m
     const data = await sendBrevoEmail(payload);[m
[36m@@ -295,9 +295,9 @@[m [mexport const sendConfirmationEmail = async ([m
 [m
   const mapsUrl = getGoogleMapsUrl(booking);[m
   const googleCalUrl = getGoogleCalendarUrl(booking);[m
[31m-  [m
[32m+[m
   const calendar = generateICalContent(booking);[m
[31m-  [m
[32m+[m
   const htmlContent = `[m
     <!DOCTYPE html>[m
     <html>[m
[36m@@ -344,19 +344,19 @@[m [mexport const sendConfirmationEmail = async ([m
           [m
           <h2>🎯 Ce qu'il faut apporter</h2>[m
           ${isFitting[m
[31m-            ? `<ul>[m
[32m+[m[32m      ? `<ul>[m
                  <li>Votre vélo (si vous en avez un)</li>[m
                  <li>Votre tenue de cyclisme habituelle</li>[m
                  <li>Vos chaussures de vélo</li>[m
                  <li>Vos cales/pédales automatiques si vous en utilisez</li>[m
                </ul>`[m
[31m-            : `<ul>[m
[32m+[m[32m      : `<ul>[m
                  <li>Le vélo concerné par l'intervention</li>[m
                  <li>Votre clé d'antivol (si le vélo est attaché)</li>[m
                  <li>Le ticket de caisse ou la facture en cas de prise en charge garantie</li>[m
                  <li>Tout élément utile au diagnostic (ancien devis, photos, etc.)</li>[m
                </ul>`[m
[31m-          }[m
[32m+[m[32m    }[m
           [m
           <h2>📍 Accès au magasin</h2>[m
           <p><strong>${booking.store_name}</strong></p>[m
[36m@@ -393,11 +393,11 @@[m [mexport const sendConfirmationEmail = async ([m
     </body>[m
     </html>[m
   `;[m
[31m-  [m
[32m+[m
   const payload = {[m
[31m-    sender: { [m
[31m-      name: 'Alltricks Bike Fitting', [m
[31m-      email: process.env.EMAIL_FROM || 'noreply@alltricks.com' [m
[32m+[m[32m    sender: {[m
[32m+[m[32m      name: 'Alltricks Services',[m
[32m+[m[32m      email: process.env.EMAIL_FROM || 'noreply@alltricks.com'[m
     },[m
     to: [{ email: booking.customer_email, name: `${booking.customer_firstname} ${booking.customer_lastname}` }],[m
     subject: `✅ Réservation confirmée - ${booking.service_name}`,[m
[36m@@ -407,7 +407,7 @@[m [mexport const sendConfirmationEmail = async ([m
       content: Buffer.from(generateICalContent(booking)).toString('base64'),[m
     }][m
   };[m
[31m-  [m
[32m+[m
   console.log(`[Email] Tentative d'envoi de confirmation à ${booking.customer_email}`);[m
   try {[m
     const data = await sendBrevoEmail(payload);[m
[36m@@ -429,11 +429,11 @@[m [mexport const sendReminderEmail = async ([m
   const cancelUrl = `${process.env.FRONTEND_URL}/booking/${booking.booking_token}/cancel`;[m
   const isFitting = booking.service_type === 'fitting';[m
   const mapsUrl = getGoogleMapsUrl(booking);[m
[31m-  [m
[31m-  const subject = daysBeforeconst === 2 [m
[32m+[m
[32m+[m[32m  const subject = daysBeforeconst === 2[m
     ? `🔔 Rappel : Votre ${isFitting ? "étude posturale" : "rendez-vous atelier"} dans 2 jours`[m
     : `⏰ Rappel : Votre ${isFitting ? "étude posturale" : "rendez-vous atelier"} demain`;[m
[31m-  [m
[32m+[m
   const htmlContent = `[m
     <!DOCTYPE html>[m
     <html>[m
[36m@@ -468,9 +468,9 @@[m [mexport const sendReminderEmail = async ([m
           [m
           <p>[m
             ${isFitting[m
[31m-              ? "N'oubliez pas d'apporter votre vélo (si vous en avez un), votre tenue et vos chaussures de cyclisme."[m
[31m-              : "Merci d'apporter le vélo concerné, ainsi que votre clé d'antivol et vos justificatifs si une prise en charge garantie est nécessaire."[m
[31m-            }[m
[32m+[m[32m      ? "N'oubliez pas d'apporter votre vélo (si vous en avez un), votre tenue et vos chaussures de cyclisme."[m
[32m+[m[32m      : "Merci d'apporter le vélo concerné, ainsi que votre clé d'antivol et vos justificatifs si une prise en charge garantie est nécessaire."[m
[32m+[m[32m    }[m
           </p>[m
 [m
           <p>[m
[36m@@ -493,17 +493,17 @@[m [mexport const sendReminderEmail = async ([m
     </body>[m
     </html>[m
   `;[m
[31m-  [m
[32m+[m
   const payload = {[m
[31m-    sender: { [m
[31m-      name: 'Alltricks Bike Fitting', [m
[31m-      email: process.env.EMAIL_FROM || 'noreply@alltricks.com' [m
[32m+[m[32m    sender: {[m
[32m+[m[32m      name: 'Alltricks Services',[m
[32m+[m[32m      email: process.env.EMAIL_FROM || 'noreply@alltricks.com'[m
     },[m
     to: [{ email: booking.customer_email, name: booking.customer_firstname }],[m
     subject: subject,[m
     htmlContent: htmlContent[m
   };[m
[31m-  [m
[32m+[m
   console.log(`[Email] Tentative d'envoi de rappel (${daysBeforeconst}j) à ${booking.customer_email}`);[m
   try {[m
     const data = await sendBrevoEmail(payload);[m
[36m@@ -522,7 +522,7 @@[m [mexport const sendCancellationEmail = async ([m
 ): Promise<void> => {[m
   const dateFormatted = format(new Date(booking.start_datetime), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });[m
   const bookAgainUrl = `${process.env.FRONTEND_URL}/stores/${booking.store_id}`;[m
[31m-  [m
[32m+[m
   const htmlContent = `[m
     <!DOCTYPE html>[m
     <html>[m
[36m@@ -569,17 +569,17 @@[m [mexport const sendCancellationEmail = async ([m
     </body>[m
     </html>[m
   `;[m
[31m-  [m
[32m+[m
   const payload = {[m
[31m-    sender: { [m
[31m-      name: 'Alltricks Bike Fitting', [m
[31m-      email: process.env.EMAIL_FROM || 'noreply@alltricks.com' [m
[32m+[m[32m    sender: {[m
[32m+[m[32m      name: 'Alltricks Services',[m
[32m+[m[32m      email: process.env.EMAIL_FROM || 'noreply@alltricks.com'[m
     },[m
     to: [{ email: booking.customer_email, name: `${booking.customer_firstname} ${booking.customer_lastname}` }],[m
     subject: '❌ Réservation annulée',[m
     htmlContent: htmlContent[m
   };[m
[31m-  [m
[32m+[m
   console.log(`[Email] Tentative d'envoi d'annulation à ${booking.customer_email}`);[m
   try {[m
     const data = await sendBrevoEmail(payload);[m
[36m@@ -598,7 +598,7 @@[m [mexport const sendPasswordResetEmail = async ([m
   resetToken: string[m
 ): Promise<void> => {[m
   const resetUrl = `${process.env.FRONTEND_URL}/admin/reset-password/${resetToken}`;[m
[31m-  [m
[32m+[m
   const htmlContent = `[m
     <!DOCTYPE html>[m
     <html>[m
[36m@@ -641,17 +641,17 @@[m [mexport const sendPasswordResetEmail = async ([m
     </body>[m
     </html>[m
   `;[m
[31m-  [m
[32m+[m
   const payload = {[m
[31m-    sender: { [m
[31m-      name: 'Alltricks Admin', [m
[31m-      email: process.env.EMAIL_FROM || 'noreply@alltricks.com' [m
[32m+[m[32m    sender: {[m
[32m+[m[32m      name: 'Alltricks Admin',[m
[32m+[m[32m      email: process.env.EMAIL_FROM || 'noreply@alltricks.com'[m
     },[m
     to: [{ email: email }],[m
     subject: '🔒 Réinitialisation de votre mot de passe',[m
     htmlContent: htmlContent[m
   };[m
[31m-  [m
[32m+[m
   console.log(`[Email] Envoi email reset password à ${email}`);[m
   try {[m
     const data = await sendBrevoEmail(payload);[m
[36m@@ -672,7 +672,7 @@[m [mexport const verifyEmailConfig = async (): Promise<boolean> => {[m
       console.error('❌ BREVO_API_KEY non configurée');[m
       return false;[m
     }[m
[31m-    [m
[32m+[m
     const response = await fetch('https://api.brevo.com/v3/account', {[m
       headers: {[m
         'api-key': apiKey,[m
[1mdiff --git a/frontend/index.html b/frontend/index.html[m
[1mindex 9678a70..b7e35cf 100644[m
[1m--- a/frontend/index.html[m
[1m+++ b/frontend/index.html[m
[36m@@ -1,23 +1,22 @@[m
 <!DOCTYPE html>[m
 <html lang="fr">[m
[31m-  <head>[m
[31m-    <meta charset="UTF-8" />[m
[31m-    <link rel="icon" type="image/svg+xml" href="/vite.svg" />[m
[31m-    <meta name="viewport" content="width=device-width, initial-scale=1.0" />[m
[31m-    <meta[m
[31m-      name="description"[m
[31m-      content="Réservez votre étude posturale bike fitting en ligne"[m
[31m-    />[m
[31m-    <link rel="preconnect" href="https://fonts.googleapis.com" />[m
[31m-    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />[m
[31m-    <link[m
[31m-      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Overpass:wght@400;600;700;800&family=Roboto:wght@400;500;700&display=swap"[m
[31m-      rel="stylesheet"[m
[31m-    />[m
[31m-    <title>Bike Fitting - Réservation en ligne</title>[m
[31m-  </head>[m
[31m-  <body>[m
[31m-    <div id="root"></div>[m
[31m-    <script type="module" src="/src/main.tsx"></script>[m
[31m-  </body>[m
[31m-</html>[m
[32m+[m
[32m+[m[32m<head>[m
[32m+[m[32m  <meta charset="UTF-8" />[m
[32m+[m[32m  <link rel="icon" type="image/svg+xml" href="/vite.svg" />[m
[32m+[m[32m  <meta name="viewport" content="width=device-width, initial-scale=1.0" />[m
[32m+[m[32m  <meta name="description" content="Réservez votre étude posturale bike fitting en ligne" />[m
[32m+[m[32m  <link rel="preconnect" href="https://fonts.googleapis.com" />[m
[32m+[m[32m  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />[m
[32m+[m[32m  <link[m
[32m+[m[32m    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Overpass:wght@400;600;700;800&family=Roboto:wght@400;500;700&display=swap"[m
[32m+[m[32m    rel="stylesheet" />[m
[32m+[m[32m  <title>Alltricks Services - Réservation en ligne</title>[m
[32m+[m[32m</head>[m
[32m+[m
[32m+[m[32m<body>[m
[32m+[m[32m  <div id="root"></div>[m
[32m+[m[32m  <script type="module" src="/src/main.tsx"></script>[m
[32m+[m[32m</body>[m
[32m+[m
[32m+[m[32m</html>[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/pages/ModernBookingConfirmation.tsx b/frontend/src/pages/ModernBookingConfirmation.tsx[m
[1mindex 2cde793..4a7ea0b 100644[m
[1m--- a/frontend/src/pages/ModernBookingConfirmation.tsx[m
[1m+++ b/frontend/src/pages/ModernBookingConfirmation.tsx[m
[36m@@ -203,15 +203,6 @@[m [mEND:VCALENDAR`;[m
                 <h3 className="text-xl font-bold text-gray-900">[m
                   {booking.service_name}[m
                 </h3>[m
[31m-                {!isCancelled && ([m
[31m-                  <button[m
[31m-                    onClick={() => navigate(`/stores/${booking.store_id}/booking?edit=${token}`)}[m
[31m-                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"[m
[31m-                  >[m
[31m-                    <Edit2 className="h-4 w-4" />[m
[31m-                    Modifier[m
[31m-                  </button>[m
[31m-                )}[m
               </div>[m
 [m
               <div className="space-y-4">[m
[1mdiff --git a/frontend/src/pages/ModernBookingPage.tsx b/frontend/src/pages/ModernBookingPage.tsx[m
[1mindex 155a07a..aaa4472 100644[m
[1m--- a/frontend/src/pages/ModernBookingPage.tsx[m
[1m+++ b/frontend/src/pages/ModernBookingPage.tsx[m
[36m@@ -254,7 +254,15 @@[m [mexport default function ModernBookingPage() {[m
   const getDaysInMonth = () => {[m
     const start = startOfMonth(currentMonth);[m
     const end = endOfMonth(currentMonth);[m
[31m-    return eachDayOfInterval({ start, end });[m
[32m+[m[32m    const days = eachDayOfInterval({ start, end });[m
[32m+[m[41m    [m
[32m+[m[32m    // Calculer le décalage pour le premier jour du mois (Lundi = 0, ..., Dimanche = 6)[m
[32m+[m[32m    // getDay() renvoie 0 pour Dimanche, 1 pour Lundi, etc.[m
[32m+[m[32m    // On veut Lundi en premier, donc on ajuste : (day + 6) % 7[m
[32m+[m[32m    const firstDayOfWeek = (start.getDay() + 6) % 7;[m
[32m+[m[32m    const padding = Array(firstDayOfWeek).fill(null);[m
[32m+[m[41m    [m
[32m+[m[32m    return [...padding, ...days];[m
   };[m
 [m
   if (!store) {[m
[36m@@ -438,6 +446,9 @@[m [mexport default function ModernBookingPage() {[m
                       </div>[m
                       <div className="grid grid-cols-7 gap-1">[m
                         {getDaysInMonth().map((day, i) => {[m
[32m+[m[32m                          if (!day) {[m
[32m+[m[32m                            return <div key={`empty-${i}`} className="aspect-square" />;[m
[32m+[m[32m                          }[m
                           const isPast = isBefore(day, startOfDay(new Date()));[m
                           const isSelected = selectedDate && isSameDay(day, selectedDate);[m
                           const isCurrentDay = isToday(day);[m
[36m@@ -523,12 +534,6 @@[m [mexport default function ModernBookingPage() {[m
                 <div className="space-y-4">[m
                   <div className="flex items-center justify-between">[m
                     <h2 className="text-xl font-extrabold text-[#142129]">Vos informations</h2>[m
[31m-                    <button[m
[31m-                      onClick={() => setStep('date')}[m
[31m-                      className="text-xs text-[#005162] font-semibold hover:underline"[m
[31m-                    >[m
[31m-                      Modifier[m
[31m-                    </button>[m
                   </div>[m
 [m
                   {isAdmin && ([m
[1mdiff --git a/frontend/src/pages/admin/AdminCustomerDirectoryPage.tsx b/frontend/src/pages/admin/AdminCustomerDirectoryPage.tsx[m
[1mindex c7d1a7c..e9f5a47 100644[m
[1m--- a/frontend/src/pages/admin/AdminCustomerDirectoryPage.tsx[m
[1m+++ b/frontend/src/pages/admin/AdminCustomerDirectoryPage.tsx[m
[36m@@ -75,18 +75,19 @@[m [mexport default function AdminCustomerDirectoryPage() {[m
       setStores(storeData);[m
       [m
       // Récupérer le store_id de l'admin connecté via le token[m
[31m-      const token = localStorage.getItem('admin_token');[m
[31m-      let adminStoreId = null;[m
[32m+[m[32m      const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');[m
[32m+[m[32m      let currentAdminStoreId = null;[m
       if (token) {[m
         const decoded = parseJwt(token);[m
         if (decoded && decoded.store_id) {[m
[31m-          adminStoreId = decoded.store_id;[m
[32m+[m[32m          currentAdminStoreId = decoded.store_id;[m
[32m+[m[32m          setAdminStoreId(currentAdminStoreId);[m
         }[m
       }[m
 [m
       // Pré-sélectionner le magasin : soit celui de l'admin, soit le premier de la liste, soit garder l'actuel[m
[31m-      if (adminStoreId) {[m
[31m-        setSelectedStore(adminStoreId);[m
[32m+[m[32m      if (currentAdminStoreId) {[m
[32m+[m[32m        setSelectedStore(currentAdminStoreId);[m
       } else if (storeData.length > 0 && !selectedStore) {[m
         setSelectedStore(storeData[0].id);[m
       }[m
[36m@@ -246,18 +247,20 @@[m [mexport default function AdminCustomerDirectoryPage() {[m
             </div>[m
           </div>[m
           <div className="flex gap-2">[m
[31m-            <select[m
[31m-              value={selectedStore}[m
[31m-              onChange={(e) => setSelectedStore(e.target.value)}[m
[31m-              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"[m
[31m-            >[m
[31m-              <option value="">Sélectionner un magasin</option>[m
[31m-              {stores.map(store => ([m
[31m-                <option key={store.id} value={store.id}>[m
[31m-                  {store.name} ({store.city})[m
[31m-                </option>[m
[31m-              ))}[m
[31m-            </select>[m
[32m+[m[32m            {!adminStoreId && ([m
[32m+[m[32m              <select[m
[32m+[m[32m                value={selectedStore}[m
[32m+[m[32m                onChange={(e) => setSelectedStore(e.target.value)}[m
[32m+[m[32m                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"[m
[32m+[m[32m              >[m
[32m+[m[32m                <option value="">Sélectionner un magasin</option>[m
[32m+[m[32m                {stores.map(store => ([m
[32m+[m[32m                  <option key={store.id} value={store.id}>[m
[32m+[m[32m                    {store.name} ({store.city})[m
[32m+[m[32m                  </option>[m
[32m+[m[32m                ))}[m
[32m+[m[32m              </select>[m
[32m+[m[32m            )}[m
             <Button onClick={openCreateModal} disabled={!selectedStore}>[m
               <Plus className="h-4 w-4 mr-2" />[m
               Nouveau client[m
[1mdiff --git a/frontend/src/pages/admin/AdminUsersManagementPage.tsx b/frontend/src/pages/admin/AdminUsersManagementPage.tsx[m
[1mindex a8cb285..a99c9f9 100644[m
[1m--- a/frontend/src/pages/admin/AdminUsersManagementPage.tsx[m
[1m+++ b/frontend/src/pages/admin/AdminUsersManagementPage.tsx[m
[36m@@ -5,7 +5,7 @@[m [mimport AdminLayout from '../../components/admin/AdminLayout';[m
 import Button from '../../components/Button';[m
 import Input from '../../components/Input';[m
 import { Store, AdminWithStore, CreateAdminData, UpdateAdminData, CreateStoreData } from '../../types';[m
[31m-import { getStores, getAdmins, createAdmin, updateAdmin, deleteAdminApi, createStore } from '../../services/api';[m
[32m+[m[32mimport { getStores, getAdmins, createAdmin, updateAdmin, deleteAdminApi, createStore, deleteStore } from '../../services/api';[m
 [m
 interface AdminFormState {[m
   id?: string;[m
[36m@@ -179,6 +179,17 @@[m [mexport default function AdminUsersManagementPage() {[m
     }[m
   };[m
 [m
[32m+[m[32m  const handleDeleteStore = async (store: Store) => {[m
[32m+[m[32m    if (!confirm(`Supprimer définitivement le magasin ${store.name} ? Cette action supprimera également tous les services, administrateurs et réservations associés.`)) return;[m
[32m+[m[32m    try {[m
[32m+[m[32m      await deleteStore(store.id);[m
[32m+[m[32m      await loadData();[m
[32m+[m[32m    } catch (error) {[m
[32m+[m[32m      console.error('Erreur suppression magasin:', error);[m
[32m+[m[32m      alert('Erreur lors de la suppression du magasin');[m
[32m+[m[32m    }[m
[32m+[m[32m  };[m
[32m+[m
   const availableStoresForNewAdmin = useMemo(() => {[m
     const usedStoreIds = new Set(admins.filter(a => a.store_id).map(a => a.store_id as string));[m
     return stores.filter(store => !usedStoreIds.has(store.id));[m
[36m@@ -240,47 +251,60 @@[m [mexport default function AdminUsersManagementPage() {[m
                       <p className="text-sm text-gray-500">{store.city}</p>[m
                     </div>[m
                   </div>[m
[31m-                  {admin ? ([m
[31m-                    <div className="space-y-2 text-sm">[m
[31m-                      <div className="flex items-center justify-between">[m
[31m-                        <span className="font-medium text-gray-900">{admin.name}</span>[m
[31m-                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${admin.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>[m
[31m-                          {admin.active ? 'Actif' : 'Inactif'}[m
[31m-                        </span>[m
[32m+[m[32m                  <div className="flex-1">[m
[32m+[m[32m                    {admin ? ([m
[32m+[m[32m                      <div className="space-y-2 text-sm">[m
[32m+[m[32m                        <div className="flex items-center justify-between">[m
[32m+[m[32m                          <span className="font-medium text-gray-900">{admin.name}</span>[m
[32m+[m[32m                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${admin.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>[m
[32m+[m[32m                            {admin.active ? 'Actif' : 'Inactif'}[m
[32m+[m[32m                          </span>[m
[32m+[m[32m                        </div>[m
[32m+[m[32m                        <p className="text-gray-600 truncate">{admin.email}</p>[m
[32m+[m[32m                        <p className="text-xs text-gray-500">Rôle : {admin.role === 'super_admin' ? 'Super admin' : 'Admin magasin'}</p>[m
[32m+[m[32m                        <div className="flex gap-2 mt-3">[m
[32m+[m[32m                          <Button[m
[32m+[m[32m                            variant="ghost"[m
[32m+[m[32m                            className="flex-1 border border-gray-300 hover:border-blue-500 hover:bg-blue-50"[m
[32m+[m[32m                            onClick={() => openEditModal(admin)}[m
[32m+[m[32m                          >[m
[32m+[m[32m                            <Edit2 className="h-4 w-4 mr-1" />[m
[32m+[m[32m                            Modifier[m
[32m+[m[32m                          </Button>[m
[32m+[m[32m                          <Button[m
[32m+[m[32m                            variant="ghost"[m
[32m+[m[32m                            className="border border-gray-300 hover:border-red-500 hover:bg-red-50"[m
[32m+[m[32m                            onClick={() => handleDelete(admin)}[m
[32m+[m[32m                          >[m
[32m+[m[32m                            <Trash2 className="h-4 w-4" />[m
[32m+[m[32m                          </Button>[m
[32m+[m[32m                        </div>[m
                       </div>[m
[31m-                      <p className="text-gray-600 truncate">{admin.email}</p>[m
[31m-                      <p className="text-xs text-gray-500">Rôle : {admin.role === 'super_admin' ? 'Super admin' : 'Admin magasin'}</p>[m
[31m-                      <div className="flex gap-2 mt-3">[m
[31m-                        <Button[m
[31m-                          variant="ghost"[m
[31m-                          className="flex-1 border border-gray-300 hover:border-blue-500 hover:bg-blue-50"[m
[31m-                          onClick={() => openEditModal(admin)}[m
[31m-                        >[m
[31m-                          <Edit2 className="h-4 w-4 mr-1" />[m
[31m-                          Modifier[m
[31m-                        </Button>[m
[32m+[m[32m                    ) : ([m
[32m+[m[32m                      <div className="mt-2">[m
[32m+[m[32m                        <p className="text-sm text-gray-500 mb-3">Aucun admin magasin assigné.</p>[m
                         <Button[m
                           variant="ghost"[m
[31m-                          className="border border-gray-300 hover:border-red-500 hover:bg-red-50"[m
[31m-                          onClick={() => handleDelete(admin)}[m
[32m+[m[32m                          className="w-full border border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50"[m
[32m+[m[32m                          onClick={() => openCreateModal(store.id)}[m
                         >[m
[31m-                          <Trash2 className="h-4 w-4" />[m
[32m+[m[32m                          <Plus className="h-4 w-4 mr-2" />[m
[32m+[m[32m                          Assigner un admin magasin[m
                         </Button>[m
                       </div>[m
[31m-                    </div>[m
[31m-                  ) : ([m
[31m-                    <div className="mt-2">[m
[31m-                      <p className="text-sm text-gray-500 mb-3">Aucun admin magasin assigné.</p>[m
[31m-                      <Button[m
[31m-                        variant="ghost"[m
[31m-                        className="w-full border border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50"[m
[31m-                        onClick={() => openCreateModal(store.id)}[m
[31m-                      >[m
[31m-                        <Plus className="h-4 w-4 mr-2" />[m
[31m-                        Assigner un admin magasin[m
[31m-                      </Button>[m
[31m-                    </div>[m
[31m-                  )}[m
[32m+[m[32m                    )}[m
[32m+[m[32m                  </div>[m
[32m+[m[32m                  <div className="mt-4 pt-4 border-t border-gray-100">[m
[32m+[m[32m                    <Button[m
[32m+[m[32m                      variant="ghost"[m
[32m+[m[32m                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200"[m
[32m+[m[32m                      size="sm"[m
[32m+[m[32m                      onClick={() => handleDeleteStore(store)}[m
[32m+[m[32m                    >[m
[32m+[m[32m                      <Trash2 className="h-4 w-4 mr-2" />[m
[32m+[m[32m                      Supprimer le magasin[m
[32m+[m[32m                    </Button>[m
[32m+[m[32m                  </div>[m
                 </div>[m
               );[m
             })}[m
[1mdiff --git a/frontend/src/pages/admin/AvailabilityManagementPage.tsx b/frontend/src/pages/admin/AvailabilityManagementPage.tsx[m
[1mindex 864e511..767bf31 100644[m
[1m--- a/frontend/src/pages/admin/AvailabilityManagementPage.tsx[m
[1m+++ b/frontend/src/pages/admin/AvailabilityManagementPage.tsx[m
[36m@@ -183,15 +183,17 @@[m [mexport default function AvailabilityManagementPage() {[m
       });[m
 [m
       if (!response.ok) {[m
[31m-        throw new Error('Erreur API création blocage');[m
[32m+[m[32m        const errorData = await response.json().catch(() => ({}));[m
[32m+[m[32m        console.error('Erreur API création blocage:', errorData);[m
[32m+[m[32m        throw new Error(errorData.error || errorData.message || 'Erreur API création blocage');[m
       }[m
 [m
       setShowAddModal(false);[m
       resetForm();[m
       await loadBlocks();[m
[31m-    } catch (error) {[m
[32m+[m[32m    } catch (error: any) {[m
       console.error('Erreur création blocage:', error);[m
[31m-      alert('Erreur lors de la création du blocage');[m
[32m+[m[32m      alert(error.message || 'Erreur lors de la création du blocage');[m
     }[m
   };[m
 [m
[1mdiff --git a/frontend/src/services/api.ts b/frontend/src/services/api.ts[m
[1mindex 11d2f5a..467d0b1 100644[m
[1m--- a/frontend/src/services/api.ts[m
[1m+++ b/frontend/src/services/api.ts[m
[36m@@ -20,7 +20,7 @@[m [mimport {[m
   PaginatedResponse[m
 } from '../types';[m
 [m
[31m-const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api';[m
[32m+[m[32mconst API_BASE_URL = (import.meta as any).env.VITE_API_URL || '/api';[m
 [m
 const api = axios.create({[m
   baseURL: API_BASE_URL,[m
[36m@@ -70,6 +70,15 @@[m [mexport const updateStore = async (id: string, storeData: Partial<CreateStoreData[m
   return data.data!;[m
 };[m
 [m
[32m+[m[32mexport const deleteStore = async (id: string): Promise<void> => {[m
[32m+[m[32m  const token = getAdminToken();[m
[32m+[m[32m  await api.delete(`/admin/stores/${id}`, {[m
[32m+[m[32m    headers: {[m
[32m+[m[32m      Authorization: `Bearer ${token}`,[m
[32m+[m[32m    },[m
[32m+[m[32m  });[m
[32m+[m[32m};[m
[32m+[m
 export const getStoreServices = async (storeId: string): Promise<Service[]> => {[m
   const { data } = await api.get<ApiResponse<Service[]>>(`/stores/${storeId}/services`);[m
   return data.data || [];[m
