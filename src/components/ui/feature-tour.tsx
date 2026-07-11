'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { FeatureTourStep } from '@/lib/feature-tour-types';
import { cn } from '@/lib/utils';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PopupPosition {
  top: number;
  left: number;
  placement: 'bottom' | 'top';
}

const POPUP_WIDTH = 320;
const POPUP_GAP = 14;
const SPOTLIGHT_PADDING = 8;
const POPUP_HEIGHT_ESTIMATE = 280;
const VIEWPORT_EDGE_GAP = 12;

function getSpotlightRect(targetId: string): SpotlightRect | null {
  const element = document.getElementById(targetId);
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  return {
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  };
}

function getPopupPosition(
  spotlight: SpotlightRect,
  placement: 'bottom' | 'top'
): PopupPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const spaceAbove = spotlight.top - POPUP_GAP - VIEWPORT_EDGE_GAP;
  const spaceBelow =
    viewportHeight - (spotlight.top + spotlight.height) - POPUP_GAP - VIEWPORT_EDGE_GAP;

  let nextPlacement = placement;
  if (
    (placement === 'bottom' && spaceBelow < POPUP_HEIGHT_ESTIMATE && spaceAbove > spaceBelow) ||
    (placement === 'top' && spaceAbove < POPUP_HEIGHT_ESTIMATE && spaceBelow > spaceAbove)
  ) {
    nextPlacement = placement === 'bottom' ? 'top' : 'bottom';
  }

  let top =
    nextPlacement === 'bottom'
      ? spotlight.top + spotlight.height + POPUP_GAP
      : spotlight.top - POPUP_HEIGHT_ESTIMATE - POPUP_GAP;

  if (top + POPUP_HEIGHT_ESTIMATE > viewportHeight - VIEWPORT_EDGE_GAP) {
    top = spotlight.top - POPUP_HEIGHT_ESTIMATE - POPUP_GAP;
    nextPlacement = 'top';
  }

  if (top < VIEWPORT_EDGE_GAP) {
    top = spotlight.top + spotlight.height + POPUP_GAP;
    nextPlacement = 'bottom';
  }

  top = Math.max(
    VIEWPORT_EDGE_GAP,
    Math.min(top, viewportHeight - POPUP_HEIGHT_ESTIMATE - VIEWPORT_EDGE_GAP)
  );

  let left = spotlight.left + spotlight.width / 2 - POPUP_WIDTH / 2;
  left = Math.max(
    VIEWPORT_EDGE_GAP,
    Math.min(left, viewportWidth - POPUP_WIDTH - VIEWPORT_EDGE_GAP)
  );

  return { top, left, placement: nextPlacement };
}

interface FeatureTourProps {
  steps: FeatureTourStep[];
  storageKey: string;
  titleId: string;
  finishLabel?: string;
  onStepChange?: (step: FeatureTourStep, stepIndex: number) => void;
  onClose?: () => void;
}

export default function FeatureTour({
  steps,
  storageKey,
  titleId,
  finishLabel = 'Got it',
  onStepChange,
  onClose,
}: FeatureTourProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [popupPosition, setPopupPosition] = useState<PopupPosition | null>(null);
  const onStepChangeRef = useRef(onStepChange);

  useEffect(() => {
    onStepChangeRef.current = onStepChange;
  }, [onStepChange]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const isWelcomeStep = !step?.targetId;
  const showCenteredPopup = isWelcomeStep || !popupPosition;

  const closeTour = useCallback(
    (persist = true) => {
      setIsOpen(false);
      onClose?.();
      if (persist) {
        try {
          localStorage.setItem(storageKey, '1');
        } catch {
          // ignore storage errors
        }
      }
    },
    [onClose, storageKey]
  );

  const updateLayout = useCallback(() => {
    if (!step?.targetId) {
      setSpotlight(null);
      setPopupPosition(null);
      return;
    }

    const nextSpotlight = getSpotlightRect(step.targetId);
    if (!nextSpotlight) {
      setSpotlight(null);
      setPopupPosition(null);
      return;
    }

    setSpotlight(nextSpotlight);
    setPopupPosition(getPopupPosition(nextSpotlight, step.placement ?? 'bottom'));
  }, [step]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    try {
      const completed = localStorage.getItem(storageKey) === '1';
      if (!completed) {
        const timer = window.setTimeout(() => setIsOpen(true), 900);
        return () => window.clearTimeout(timer);
      }
    } catch {
      const timer = window.setTimeout(() => setIsOpen(true), 900);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [mounted, storageKey]);

  useEffect(() => {
    if (!isOpen || !step) {
      return;
    }

    onStepChangeRef.current?.(step, stepIndex);

    if (step.targetId) {
      const element = document.getElementById(step.targetId);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }

    const frame = window.requestAnimationFrame(() => {
      updateLayout();
    });

    const layoutTimer = window.setTimeout(() => {
      updateLayout();
    }, 280);

    const handleLayoutChange = () => updateLayout();
    window.addEventListener('resize', handleLayoutChange);
    window.addEventListener('scroll', handleLayoutChange, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(layoutTimer);
      window.removeEventListener('resize', handleLayoutChange);
      window.removeEventListener('scroll', handleLayoutChange, true);
    };
  }, [isOpen, stepIndex, step, updateLayout]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.body.classList.add('feature-tour-active');

    return () => {
      document.body.classList.remove('feature-tour-active');
    };
  }, [isOpen]);

  const goNext = () => {
    if (isLastStep) {
      closeTour(true);
      return;
    }

    setStepIndex((current) => current + 1);
  };

  if (!mounted || !isOpen || !step) {
    return null;
  }

  const tourUi = (
    <div
      className="fixed inset-0 z-[300] pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {!isWelcomeStep && spotlight ? (
        <div
          className="pointer-events-none fixed rounded-xl border-2 border-[var(--color-accent)] transition-all duration-300 ease-out"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.68)',
          }}
        />
      ) : (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-[1px]"
          aria-hidden="true"
        />
      )}

      {showCenteredPopup ? (
        <div className="fixed inset-0 z-[310] flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[var(--color-surface)] p-6 shadow-2xl">
            <TourPopupContent
              step={step}
              stepIndex={stepIndex}
              totalSteps={steps.length}
              isLastStep={isLastStep}
              titleId={titleId}
              finishLabel={finishLabel}
              onSkip={() => closeTour(true)}
              onNext={goNext}
            />
          </div>
        </div>
      ) : popupPosition ? (
        <div
          className="fixed z-[310] max-h-[calc(100dvh-24px)] w-[min(320px,calc(100vw-24px))] overflow-y-auto overscroll-contain rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[var(--color-surface)] p-5 shadow-2xl pointer-events-auto transition-all duration-300"
          style={{ top: popupPosition.top, left: popupPosition.left }}
        >
          <div
            className={cn(
              'absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[var(--color-surface)]',
              popupPosition.placement === 'bottom'
                ? '-top-1.5 border-b-0 border-r-0'
                : '-bottom-1.5 border-l-0 border-t-0'
            )}
            aria-hidden="true"
          />
          <TourPopupContent
            step={step}
            stepIndex={stepIndex}
            totalSteps={steps.length}
            isLastStep={isLastStep}
            titleId={titleId}
            finishLabel={finishLabel}
            onSkip={() => closeTour(true)}
            onNext={goNext}
          />
        </div>
      ) : null}
    </div>
  );

  return createPortal(tourUi, document.body);
}

function TourPopupContent({
  step,
  stepIndex,
  totalSteps,
  isLastStep,
  titleId,
  finishLabel,
  onSkip,
  onNext,
}: {
  step: FeatureTourStep;
  stepIndex: number;
  totalSteps: number;
  isLastStep: boolean;
  titleId: string;
  finishLabel: string;
  onSkip: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_92%)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
          <Sparkles className="size-3" />
          Feature {stepIndex + 1} / {totalSteps}
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-muted-text)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-heading)]"
          aria-label="Close tour"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <h2 id={titleId} className="font-display text-xl text-[var(--color-heading)]">
        {step.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-text)]">
        {step.description}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm font-medium text-[var(--color-muted-text)] transition hover:text-[var(--color-heading)]"
        >
          Skip tour
        </button>
        <Button type="button" size="sm" onClick={onNext}>
          {isLastStep ? finishLabel : 'Next'}
          {!isLastStep ? <ArrowRight className="size-3.5" /> : null}
        </Button>
      </div>
    </>
  );
}
