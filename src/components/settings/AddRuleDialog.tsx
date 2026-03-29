import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTranslation } from 'react-i18next';
import { Loader2, ChevronDown, Sparkles } from 'lucide-react';

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

const MATCH_TYPE_MAP: Record<string, string> = {
  SMART: 'SMART',
  CONTAINS: 'CONTAINS',
  STARTS_WITH: 'STARTS_WITH',
  EXACT: 'EXACT',
  REGEX: 'REGEX',
};

const HELP_KEY_MAP: Record<string, string> = {
  SMART: 'matchHelp_SMART',
  CONTAINS: 'matchHelp_CONTAINS',
  STARTS_WITH: 'matchHelp_STARTS_WITH',
  EXACT: 'matchHelp_EXACT',
  REGEX: 'matchHelp_REGEX',
};

const BASIC_TYPES = ['SMART', 'CONTAINS', 'STARTS_WITH'];
const ADVANCED_TYPES = ['EXACT', 'REGEX'];

export function AddRuleDialog({ open, categoryName, editingRule, onClose, onSave, isSaving }: Props) {
  const { t } = useTranslation('settings');
  const [pattern, setPattern] = useState('');
  const [matchType, setMatchType] = useState('SMART');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (open && editingRule) {
      setPattern(editingRule.pattern);
      setMatchType(editingRule.matchType);
      setShowAdvanced(ADVANCED_TYPES.includes(editingRule.matchType));
    } else if (open) {
      setPattern('');
      setMatchType('SMART');
      setShowAdvanced(false);
    }
  }, [open, editingRule]);

  const isEditing = !!editingRule;

  const handleSave = () => {
    if (!pattern.trim()) return;
    onSave(pattern.trim(), matchType);
  };

  const handleClose = () => {
    setPattern('');
    setMatchType('SMART');
    setShowAdvanced(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[420px]">
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
                {BASIC_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    <span className="flex items-center gap-1.5">
                      {type === 'SMART' && <Sparkles className="w-3.5 h-3.5 text-primary" />}
                      {type === 'SMART' ? t('categories.smartMatch') : 
                       type === 'CONTAINS' ? t('categories.contains') : 
                       t('categories.startsWith')}
                    </span>
                  </SelectItem>
                ))}
                {showAdvanced && ADVANCED_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === 'EXACT' ? t('categories.exact') : t('categories.regex')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t(`categories.${HELP_KEY_MAP[matchType]}`)}
            </p>
          </div>

          {!showAdvanced && (
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className="w-3 h-3" />
                  {t('categories.advancedOptions')}
                </button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
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
