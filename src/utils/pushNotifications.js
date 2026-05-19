import API from '../api/axios';

export async function subscribeUser() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported');
    return null;
  }

  // Check permission first
  if (Notification.permission === 'denied') {
    toast.error('Notifications blocked. Enable them in browser settings.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const { data } = await API.get('/notifications/vapid-public-key');

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey)
    });

    await API.post('/notifications/subscribe', subscription);
    toast.success('Notifications enabled');
    return subscription;
  } catch (err) {
    console.error('Subscribe failed:', err);
    if (err.name === 'NotAllowedError') {
      toast.error('Please allow notifications to get reminders');
    } else {
      toast.error('Failed to enable notifications');
    }
    return null;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}