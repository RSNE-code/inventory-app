import { Capacitor } from '@capacitor/core'
import { isNative } from './capacitor'

export async function initPushNotifications() {
  if (!isNative) return

  const { PushNotifications } = await import('@capacitor/push-notifications')

  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== 'granted') return

  await PushNotifications.register()

  PushNotifications.addListener('registration', (token) => {
    fetch('/api/me/push-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.value, platform: Capacitor.getPlatform() }),
    }).catch(console.error)
  })

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received:', notification)
  })

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = action.notification.data
    if (data?.url) {
      window.location.href = data.url
    }
  })
}
