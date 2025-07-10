"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DisplaySettings } from "@/lib/types";

import type { Tree } from "@prisma/client";

interface TreeSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DisplaySettings;
  onUpdateSettings: (settings: DisplaySettings) => void;
  tree: Tree;
  onUpdateTree: () => void;
}

export default function TreeSettings({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  tree,
  onUpdateTree,
}: TreeSettingsProps) {
  const updateSetting = (key: keyof DisplaySettings, value: boolean) => {
    onUpdateSettings({
      ...settings,
      [key]: value,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tree Display Settings</DialogTitle>
          <DialogDescription>
            Customize how your family tree is displayed
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-4">Information to Display</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-birth-date">Birth Dates</Label>
                <Switch
                  id="show-birth-date"
                  checked={settings.showBirthDate}
                  onCheckedChange={(checked) =>
                    updateSetting("showBirthDate", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-death-date">Death Dates</Label>
                <Switch
                  id="show-death-date"
                  checked={settings.showDeathDate}
                  onCheckedChange={(checked) =>
                    updateSetting("showDeathDate", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-birth-place">Birth Places</Label>
                <Switch
                  id="show-birth-place"
                  checked={settings.showBirthPlace}
                  onCheckedChange={(checked) =>
                    updateSetting("showBirthPlace", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-occupation">Occupations</Label>
                <Switch
                  id="show-occupation"
                  checked={settings.showOccupation}
                  onCheckedChange={(checked) =>
                    updateSetting("showOccupation", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-photos">Photos</Label>
                <Switch
                  id="show-photos"
                  checked={settings.showPhotos}
                  onCheckedChange={(checked) =>
                    updateSetting("showPhotos", checked)
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
