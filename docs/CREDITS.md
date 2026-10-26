# Credits

## Photos

The scene photos on the home page and the public pages' header bands. All were taken in South Africa and come from Pexels under the [Pexels licence](https://www.pexels.com/license/): free for commercial use, no attribution required (we credit anyway), edits allowed. The licence forbids implying that the people or brands shown endorse First Shift, and forbids showing identifiable people in a bad light, so:

- Alt text describes only what is visible. No photo is ever captioned or presented as a First Shift user, a demo person or a business on the platform.
- Demo people (Thabo, Sipho, the example applicants) never get a real person's photo: their faces are drawn placeholders in our palette (`src/server/demoPhotos.ts`).

Each photo's licence was confirmed on its own Pexels page on 26 October 2026: the "Free" label linking to the licence, a South African location, and no sponsored label.

| File in `public/photos` | Used on | Photographer | Source |
| --- | --- | --- | --- |
| `street-stalls-morning-*.webp` | Home hero (desktop); Privacy, Terms and Contact header bands | Sello Dhlabo | [Street vendors in Johannesburg at dawn](https://www.pexels.com/photo/street-vendors-in-johannesburg-at-dawn-39122230/) |
| `tailor-sewing-machine-*.webp` | Home, How it works, for businesses | Sello Dhlabo | [Black and white portrait of South African tailor](https://www.pexels.com/photo/black-and-white-portrait-of-south-african-tailor-39641250/) |
| `city-street-corner-*.webp` | Home, safety section; Safety header band | Yiğit Karaalioğlu | [People and cars on an intersection in city](https://www.pexels.com/photo/people-and-cars-on-an-intersection-in-city-13408576/) |

Each is WebP with its metadata stripped, at 640 and 1280 wide, plus an 8:3 band crop (640x320 and 1280x480) for the header bands and the safety section. Every one is lazy-loaded at low priority and sized up front, so text draws first and nothing moves when a photo arrives.

## Icons

[Lucide](https://lucide.dev), ISC licence.

## Type

[Archivo](https://fonts.google.com/specimen/Archivo) by Omnibus-Type, SIL Open Font Licence.
