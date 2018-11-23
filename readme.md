# Notify Me! Schedule Builder (UC Davis) Push Notification App
## What Is This?
This is a work in progress app that notifies you via push notification (on desktop, ios, and android) when a spot opens up in a class.

## How To Run This?
Well for now, it's not done yet but it'll be a simple one-liner `npm app.js`.

## What Do I Need?
All the npm packages can be installed with a simple `npm install`

PushBullet must be installed on the platform you wish to receive notifications on.

You need a tokens.json file with your UC Davis Kerberos credentials and PushBullet token.

## tokens.json format
```
{
  'username': 'Bob420BlazeIt',
  'password': 'ucdavisiscool',
  'pushbullet': 'pleaseinsertyourtokenhere'
}
```

## Getting your PushBullet Token
Login to [PushBullet Settings](https://www.pushbullet.com/#settings) and generate a token there.

## Privacy Disclosure
This app WILL NOT give me any access to whatever information you have since you will be running it on your own computer or server.
However, since it uses a third party app, PushBullet, I cannot guarantee the 100% privacy protection against them.
Hopefully, there's nothing sensitive about UC Davis classes that should raise concern over being collected, so all in all this should not matter too much.
