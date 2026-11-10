/**
 * App settings. Nothing in here is secret – it all ships to the browser.
 *
 * apiBase: the MoodCapsule backend. The Azure server allows http://localhost:4200,
 * so `ng serve` works against it directly. To use a backend on your own PC instead,
 * change it to 'http://localhost:8080/api'.
 *
 * googleClientId: the WEB OAuth client ID from Google Cloud (the same one the backend
 * checks in GOOGLE_CLIENT_IDS). Every site address that shows the Google button must be
 * listed under "Authorized JavaScript origins" for this client.
 */
export const environment = {
  apiBase: 'https://moodcapsule-api-epdgawcmd3cjhact.canadacentral-01.azurewebsites.net/api',
  googleClientId: '1091359255273-9pr02lp7bvs2ujdsa6oj1p1ni4kdg0jp.apps.googleusercontent.com',
  privacyUrl: 'https://moodcapsule-api-epdgawcmd3cjhact.canadacentral-01.azurewebsites.net/privacy.html',
  termsUrl: 'https://moodcapsule-api-epdgawcmd3cjhact.canadacentral-01.azurewebsites.net/terms.html',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.moodcapsule.app'
};
