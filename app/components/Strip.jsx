"use client";
import React from "react";
import { Cell } from "./Cell";

export function Strip({ strip, cellSize }) {
  return (
    <div className="flex flex-col">
      {strip.map((sym, i) => (
        <Cell key={i} sym={sym} size={cellSize} faded />
      ))}
    </div>
  );
}
