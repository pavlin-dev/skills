# Before sending (technical checks)

The viewer critique is in `engaging-video`; these are the mechanical checks that go with it.

- Contact sheet of the final file: `ffmpeg -i out.mp4 -vf "fps=2,scale=216:-1,tile=10x4" -frames:v 1 contact.png`, then look at it: no empty frames, no overlapping texts in morphs, captions not covered by the motif, nothing important in the bottom ~350 px (platform UI).
- Stills of the exact frames of landings and cuts sit on beats.
- Loudness ≈ −14 LUFS (`ffmpeg -i out.mp4 -af ebur128 -f null -`), exactly the planned length (`ffprobe`).
- Send the smaller of the master and `-share.mp4` with `show_file` (limit 25 MB) and give the path to the full-quality file.
