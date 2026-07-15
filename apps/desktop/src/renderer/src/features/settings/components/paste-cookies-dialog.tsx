import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@vault/ui/components/dialog";
import { Textarea } from "@vault/ui/components/textarea";
import { Button } from "@vault/ui/components/button";
import { toast } from "sonner";

interface PasteCookiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const PasteCookiesDialog = ({ open, onOpenChange, onSuccess }: PasteCookiesDialogProps) => {
  const [cookiesText, setCookiesText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!cookiesText.trim()) {
      toast.error("Please paste cookies before saving");
      return;
    }

    // Basic validation: check if it looks like Netscape format
    if (!cookiesText.includes("# Netscape HTTP Cookie File") && !cookiesText.includes("\t")) {
      toast.error("Invalid format. Expected Netscape cookie format.");
      return;
    }

    setSaving(true);
    try {
      const result = await window.api.saveCookies(cookiesText);
      if (result.success) {
        toast.success("Cookies saved successfully");
        setCookiesText("");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error || "Failed to save cookies");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Paste Cookies (Netscape Format)</DialogTitle>
          <DialogDescription>
            Use a browser extension like "Get cookies.txt LOCALLY" to export cookies in Netscape format, then paste here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            value={cookiesText}
            onChange={(e) => setCookiesText(e.target.value)}
            placeholder="# Netscape HTTP Cookie File
# This is a generated file!  Do not edit.
.youtube.com	TRUE	/	TRUE	0	PREF	f1=50000000
.youtube.com	TRUE	/	FALSE	0	VISITOR_INFO1_LIVE	..."
            className="min-h-[300px] font-mono text-xs"
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Cookies"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
