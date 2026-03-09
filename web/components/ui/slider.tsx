"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root>;

export function Slider({ className, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={[
        "relative flex w-full touch-none select-none items-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/12">
        <SliderPrimitive.Range className="absolute h-full bg-white/80" />
      </SliderPrimitive.Track>
      {Array.from({ length: props.value?.length ?? 1 }).map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className="block h-4 w-4 rounded-full border border-white/35 bg-zinc-100 shadow-[0_0_0_1px_rgba(0,0,0,0.28)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  );
}
