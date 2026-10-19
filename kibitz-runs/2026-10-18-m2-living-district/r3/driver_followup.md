# Additional driver verification during independent review

Initial Chrome harness failed its off/on/off locator-screenshot assertion. Node attempted to pretty-print two large PNG buffers, using excessive memory/time before exiting rc1. A guarded attempt to stop only the owned QA process found it already gone; no unrelated process was stopped.

Direct reproduction captured canvas backing-store PNGs, composited screenshots, camera/view/size/scroll and quest snapshots in artifacts/m2-district-canvas-diagnosis.json. Before/after backingHash both5dc198dd5604f90dbe21d5d748f679502c312a7268582c3002a1c5cdad30035e; shown hash differs. Screenshot hashes differ because HTML toast overlays fall over the same canvas crop. Direct buffer contents confirm view restoration; locator screenshots include sibling HTML overlays and cannot establish backing-store equality.

After reviewer exits: change harness to compare SHA256 of canvas.toDataURL(), retain initial failure/diagnosis, then run complete current suite including newly added fault/retry/late cases. Do not mask an app change by weakening the test; direct pixel equality is stricter for the actual canvas and avoids PNG-buffer assertion formatting. Source remains frozen during reviewer.
