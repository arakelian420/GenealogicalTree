// components/locale-switcher.tsx
"use client";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { EnFlag } from "./icons/en-flag";
import { RuFlag } from "./icons/ru-flag";
import { HyFlag } from "./icons/hy-flag";

const localeIcons: Record<string, React.ComponentType> = {
  en: EnFlag,
  ru: RuFlag,
  hy: HyFlag,
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const locales = ["en", "ru", "hy"];

  const CurrentFlag = localeIcons[locale];

  const onLocaleChange = (newLocale: string) => {
    const segments = pathname.split("/");
    segments[1] = newLocale;
    const newPathname = segments.join("/");
    router.push(newPathname);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          {CurrentFlag && <CurrentFlag />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {locales.map((l) => {
          const Flag = localeIcons[l];
          return (
            <DropdownMenuItem key={l} onClick={() => onLocaleChange(l)}>
              <div className="flex items-center gap-2">
                <Flag />
                <span>{l.toUpperCase()}</span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
