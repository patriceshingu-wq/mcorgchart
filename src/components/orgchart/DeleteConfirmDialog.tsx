import React from 'react';
import {
  AlertDialogRoot, AlertDialogContent, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '../ui/AlertDialog';
import { Button } from '../ui/Button';
import type { OrgNode } from '../../types';
import type { TranslationKeys } from '../../data/translations';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: OrgNode | null;
  descendantCount: number;
  onConfirm: () => void;
  t: TranslationKeys;
}

export function DeleteConfirmDialog({ open, onOpenChange, node, descendantCount, onConfirm, t }: DeleteConfirmDialogProps) {
  if (!node) return null;
  return (
    <AlertDialogRoot open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
        <AlertDialogDescription>
          {t.deleteWarning}
          {descendantCount > 0 && (
            <span className="block mt-2 text-rose-600 font-medium">
              {t.willAlsoDelete} {descendantCount} {t.descendants}.
            </span>
          )}
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" size="sm">{t.cancel}</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="destructive" size="sm" onClick={onConfirm}>{t.delete}</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialogRoot>
  );
}
