import { ScenePhoto, type Scene } from "./ScenePhoto";

/**
 * The header band of a public page: the title and one line on mist, and from
 * 1024 px a photo beside them in its 8:3 band crop. On a phone the photo is
 * hidden, and a hidden lazy image is never fetched, so the text is the first
 * screen.
 */
export function PlainHeader({ title, intro, photo }: { title: string; intro: string; photo?: Scene }) {
  return (
    <div className="bg-mist px-5 py-8 lg:py-16">
      <div className="mx-auto flex max-w-md flex-col gap-6 lg:grid lg:max-w-6xl lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="flex flex-col gap-3">
          <h1 className="text-title text-balance lg:text-title-lg">{title}</h1>
          <p className="text-base text-muted lg:text-xl">{intro}</p>
        </div>
        {photo ? <ScenePhoto scene={photo} crop="band" sizes="(min-width: 1024px) 36rem, 100vw" className="hidden aspect-8/3 lg:block" /> : null}
      </div>
    </div>
  );
}
