import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

interface EditingRule {
  id: string;
  pattern: string;
  matchType: string;
}

interface Props {
  open: boolean;
  categoryName: string;
  editingRule?: EditingRule | null;
  onClose: () => void;
  onSave: (pattern: string, matchType: string) => void;
  isSaving: boolean;
}

export function AddRuleDialog({ open, categoryName, editingRule, onClose, onSave, isSaving }: Props) {
  const { t } = useTranslation('settings');
  const [pattern, setPattern] = useState('');
  const [matchType, setMatchType] = useState('CONTAINS');

  useEffect(() => {
    if (open && editingRule) {
      setPattern(editingRule.pattern);
      setMatchType(editingRule.matchType);
    } else if (open) {
      setPattern('');
      setMatchType('CONTAINS');
    }
  }, [open, editingRule]);

  const isEditing = !!editingRule;

  const handleSave = () => {
    if (!pattern.trim()) return;
    onSave(pattern.trim(), matchType);
  };

  const handleClose = () => {
    setPattern('');
    setMatchType('CONTAINS');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isEditing ? t('categories.editRule') : t('categories.addRule')} — {categoryName}
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
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{t('categories.matchType')}</Label>
            <Select value={matchType} onValueChange={setMatchType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONTAINS">{t('categories.contains')}</SelectItem>
                <SelectItem value="STARTS_WITH">{t('categories.startsWith')}</SelectItem>
                <SelectItem value="EXACT">{t('categories.exact')}</SelectItem>
                <SelectItem value="REGEX">{t('categories.regex')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t(`categories.matchHelp_${matchType}`)}
            </p>
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
