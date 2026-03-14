import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  categoryName: string;
  onClose: () => void;
  onSave: (pattern: string, matchType: string) => void;
  isSaving: boolean;
}

export function AddRuleDialog({ open, categoryName, onClose, onSave, isSaving }: Props) {
  const { t } = useTranslation('settings');
  const [pattern, setPattern] = useState('');
  const [matchType, setMatchType] = useState('contains');

  const handleSave = () => {
    if (!pattern.trim()) return;
    onSave(pattern.trim(), matchType);
    setPattern('');
    setMatchType('contains');
  };

  const handleClose = () => {
    setPattern('');
    setMatchType('contains');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-base">
            {t('categories.addRule')} — {categoryName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm">{t('categories.pattern')}</Label>
            <Input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder={t('categories.patternPlaceholder')}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {t('categories.patternHelp')}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{t('categories.matchType')}</Label>
            <Select value={matchType} onValueChange={setMatchType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">{t('categories.contains')}</SelectItem>
                <SelectItem value="exact">{t('categories.exact')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('categories.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!pattern.trim() || isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {t('categories.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
