# Notify Me! Schedule Builder (UC Davis) Push Notification App
## What Is This?
This is a node.js app that notifies you via push notification (on desktop, ios, and android) when a spot opens up in a class.

It'll send updates every 30 minutes to you if there are classes open.

## How To Run This?
All you need is a simple one-liner `node app.js` and it'll send updates every 30 minutes (only if classes are available to avoid spam).

If you want to customize how many times it should send updates, run `node app.js -t -insert minutes here-`.

Example: `node app.js -t 10` will send updates every 10 minutes. **I strongly do not recommend values under 1 minute.**

I suggest using the npm package [forever](https://www.npmjs.com/package/forever) to have this script run in the background.

Alternatively, if you wanna save on your electricity bill (since you're a poor student like me!),
you can run this on your own personal server 24/7 rather than a home setup (and get updates 24/7).

To run it in verbose mode (see what's happening within each query), run `node app.js -v`.

## What Do I Need?
Well, you need node.js installed and npm installed on a **LINUX** distro or **macOS** setup.

All the npm packages can be installed with a simple `npm install`

PushBullet must be installed on the platform you wish to receive notifications on.

You need a tokens.json file with your UC Davis Kerberos credentials and PushBullet token.

In addition, you will need a classes.json file with the classes you want to keep track of.

## tokens.json Format
```
{
  'username': 'Bob420BlazeIt',
  'password': 'ucdavisiscool',
  'pushbullet_email': 'bob@koolkidsonly.com',
  'pushbullet_token': 'pleaseinsertyourtokenhere'
}
```

## Getting your PushBullet Token
Login to [PushBullet Settings](https://www.pushbullet.com/#settings) and generate a token there.

## classes.json Format
For classes that you don't care which section you get into, put under classes without a section number.
For classes where you want a specific section, put the whole name including the section number into specific_sections.
**Please make sure the class names are verbatim (matching capitalization) to avoid any errors!**
```
{
  'classes': [
    'JPN 002',
    'ECS 050'
  ],
  'specific_sections': [
    'ECS 132A A04',
    'ECS 020 A02'
  ]
}
```


## Privacy Disclosure
This app WILL NOT give me any access to whatever information you have since you will be running it on your own computer or server.
However, since it uses a third party app, PushBullet, I cannot guarantee the 100% privacy protection against them.
Hopefully, there's nothing sensitive about UC Davis classes that should raise concern over being collected, so all in all this should not matter too much.
