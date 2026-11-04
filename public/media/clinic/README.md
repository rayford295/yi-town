# Infirmary voice lines

Optional. A prescription in the infirmary (`/clinic`) gets a "hear it" button when a recording of
it read aloud sits here, named after the hurt and the reader:

```
fight-yifan.m4a   hurt-yifan.m4a   miss-yifan.m4a   tired-yifan.m4a
fight-jingyi.m4a  hurt-jingyi.m4a  miss-jingyi.m4a  tired-jingyi.m4a
```

On the Mac, `python3 scripts/record-rx.py fight yifan` records, names and converts the file in one
go. Otherwise record on a phone (Voice Memos exports .m4a) and name it as above. Missing files are simply skipped;
nothing else needs changing. The letters themselves are in `src/features/clinic/prescriptions.ts`.
