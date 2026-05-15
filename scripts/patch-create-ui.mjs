import fs from "fs";

const p = "src/components/CreateView.tsx";
let s = fs.readFileSync(p, "utf8");
const CD = "</" + "motion.div>";

// Remove opacity lock on system core children (3 blocks)
s = s.replace(/<div className="space-y-1.5 opacity-50 cursor-not-allowed">/g, '<div className="space-y-1.5">');

s = s.replace(
  /<div className="h-9 bg-white\/5 border-none rounded-xl px-4 flex items-center text-\[12px\] font-bold tracking-tight text-white\/40">\s*Gemini 2\.0 Flash \(Default\)\s*<\/div>/,
  `<Select value={formData.apiEngine} onValueChange={(v) => handleInputChange("apiEngine", v)}>
                    <SelectTrigger className="h-9 bg-white/5 border-none rounded-xl px-4 text-[12px] font-bold text-white"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="gemini">Gemini 2.5 Flash</SelectItem></SelectContent>
                 </Select>`,
);

s = s.replace(
  /<div className="h-9 bg-white\/5 border-none rounded-xl px-4 flex items-center text-\[12px\] font-bold tracking-tight text-white\/40">\s*9:16 Vertical \(Shorts\)\s*<\/div>/,
  `<Select value={formData.format} onValueChange={(v) => handleInputChange("format", v)}>
                    <SelectTrigger className="h-9 bg-white/5 border-none rounded-xl px-4 text-[12px] font-bold text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9:16">9:16 Vertical (Shorts)</SelectItem>
                      <SelectItem value="16:9">16:9 Landscape</SelectItem>
                      <SelectItem value="1:1">1:1 Square</SelectItem>
                    </SelectContent>
                 </Select>`,
);

s = s.replace(
  /<motion.div className="h-9 bg-white\/5 border-none rounded-xl px-4 flex items-center text-\[12px\] font-bold tracking-tight text-white\/40">\s*60 Seconds\s*<\/div>/,
  `<Select value={formData.duration} onValueChange={(v) => handleInputChange("duration", v)}>
                    <SelectTrigger className="h-9 bg-white/5 border-none rounded-xl px-4 text-[12px] font-bold text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 Seconds</SelectItem>
                      <SelectItem value="60">60 Seconds</SelectItem>
                      <SelectItem value="90">90 Seconds</SelectItem>
                    </SelectContent>
                 </Select>`,
);

// fix mistaken motion.div in regex - duration block uses div
s = s.replace(
  /<div className="h-9 bg-white\/5 border-none rounded-xl px-4 flex items-center text-\[12px\] font-bold tracking-tight text-white\/40">\s*60 Seconds\s*<\/div>/,
  `<Select value={formData.duration} onValueChange={(v) => handleInputChange("duration", v)}>
                    <SelectTrigger className="h-9 bg-white/5 border-none rounded-xl px-4 text-[12px] font-bold text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 Seconds</SelectItem>
                      <SelectItem value="60">60 Seconds</SelectItem>
                      <SelectItem value="90">90 Seconds</SelectItem>
                    </SelectContent>
                 </Select>`,
);

s = s.replace(
  '<button className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all group/btn">',
  '<button type="button" onClick={handleSuggestTopic} disabled={isSuggesting} className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all group/btn disabled:opacity-50">',
);

s = s.replace(
  '<button className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 text-white">',
  '<button type="button" onClick={handleVoicePreview} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 text-white">',
);

s = s.replace(
  '{Math.round(((loadingStep + 1) / loadingSteps.length) * 100)}%',
  '{jobProgress || Math.round(((loadingStep + 1) / loadingSteps.length) * 100)}%',
);

s = s.replace(
  'animate={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}',
  'animate={{ width: `${jobProgress || Math.round(((loadingStep + 1) / loadingSteps.length) * 100)}%` }}',
);

if (!s.includes("{error &&")) {
  s = s.replace(
    '<div className="flex flex-col gap-3">\n              <Button \n                onClick={handleGenerate}',
    `<motion.div className="flex flex-col gap-3">
              {error && (
                <motion.div className="ios-squircle glass-panel p-3 border border-red-500/30 bg-red-500/10 text-red-300 text-[11px] text-center">
                  {error}
                </motion.div>
              )}
              <Button 
                onClick={handleGenerate}`,
  );
  s = s.replace(
    "              </AnimatePresence>\n           </motion.div>\n        </motion.div>\n\n      </motion.div>",
    "              </AnimatePresence>\n           </motion.div>\n        </motion.div>\n\n      </motion.div>",
  );
}

fs.writeFileSync(p, s);
console.log("patched", p);
