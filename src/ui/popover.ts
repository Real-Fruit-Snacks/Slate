export interface LocalPopoverOptions {
  preferredSide?: "above" | "below";
  useFixed?: boolean;
}

/**
 * Position a popover relative to its trigger wrapper, keeping it inside the
 * viewport. With `useFixed`, the popover is placed with viewport coordinates so
 * ancestors with `overflow: hidden` or transforms cannot clip it (needed inside
 * modals). Otherwise it shifts horizontally via `--graphite-popover-shift-x` and
 * flips above/below through the `is-open-up` / `is-open-down` classes.
 */
export function alignLocalPopover(
  wrapper: HTMLElement,
  popover: HTMLElement,
  options: LocalPopoverOptions = {}
): void {
  const margin = 12;
  const preferredSide = options.preferredSide || "below";

  popover.removeClass("is-align-right");
  popover.removeClass("is-open-up");
  popover.removeClass("is-open-down");
  popover.setCssProps({ "--graphite-popover-shift-x": "0px" });

  const wrapperRect = wrapper.getBoundingClientRect();

  if (options.useFixed) {
    // Fixed positioning — use viewport coordinates so containers with
    // overflow:hidden or transforms cannot clip the popover.
    popover.setCssStyles({
      top: "",
      bottom: "",
      left: "",
      right: ""
    });

    const popoverWidth = popover.offsetWidth || 240;
    const popoverHeight = popover.offsetHeight || 220;

    let left = wrapperRect.left;
    if (left + popoverWidth > window.innerWidth - margin) {
      left = wrapperRect.right - popoverWidth;
    }
    const fixedStyles: Partial<CSSStyleDeclaration> = {
      left: `${Math.max(margin, left)}px`
    };

    const fitsBelow = wrapperRect.bottom + popoverHeight + margin <= window.innerHeight;
    const fitsAbove = wrapperRect.top - popoverHeight - margin >= 0;
    if ((preferredSide === "above" && fitsAbove) || (preferredSide === "above" && !fitsBelow)) {
      fixedStyles.bottom = `${window.innerHeight - wrapperRect.top + 8}px`;
      popover.addClass("is-open-up");
    } else {
      fixedStyles.top = `${wrapperRect.bottom + 8}px`;
      popover.addClass("is-open-down");
    }
    popover.setCssStyles(fixedStyles);
    return;
  }

  const popoverRect = popover.getBoundingClientRect();
  const popoverWidth = popoverRect.width || 240;
  const popoverHeight = popoverRect.height || 220;
  const ownerWindow = wrapper.ownerDocument.defaultView || window;

  let shiftX = 0;
  const rightOverflow = wrapperRect.left + popoverWidth - (ownerWindow.innerWidth - margin);
  if (rightOverflow > 0) {
    shiftX -= rightOverflow;
  }
  const shiftedLeft = wrapperRect.left + shiftX;
  if (shiftedLeft < margin) {
    shiftX += margin - shiftedLeft;
  }
  if (shiftX !== 0) {
    popover.setCssProps({ "--graphite-popover-shift-x": `${Math.round(shiftX)}px` });
  }

  const fitsBelow = wrapperRect.bottom + popoverHeight + margin <= ownerWindow.innerHeight;
  const fitsAbove = wrapperRect.top - popoverHeight - margin >= 0;
  if (preferredSide === "above" && fitsAbove) {
    popover.addClass("is-open-up");
    return;
  }
  if (preferredSide === "above" && !fitsBelow) {
    popover.addClass("is-open-up");
    return;
  }
  if (preferredSide === "below" && !fitsBelow && fitsAbove) {
    popover.addClass("is-open-up");
    return;
  }

  popover.addClass("is-open-down");
}
