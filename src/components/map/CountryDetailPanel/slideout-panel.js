export function openSlideoutPanel(event) {
  const target = event.target.closest("a");
  if (!target) return;

  event.preventDefault();

  const title = target.getAttribute("title") || "No title";
  const href = target.getAttribute("href") || "#";
  const dataAttr = target.getAttribute("data-bwl");

  if (!dataAttr) {
    document.getElementById("slideout-panel")?.classList.add("translate-x-full");
    return;
  }

  let countryData = {};
  try {
    countryData = JSON.parse(dataAttr);
  } catch (e) {
    console.warn("Invalid JSON in data-bwl:", e);
    return;
  }

  const { access_rank, needs_rank, pop_total, pop_christian, lang_total } = countryData;
  const content = document.getElementById("slideout-content");

  let accessRankBlock = access_rank
    ? `<div class="flex mb-4">
        <div class="mr-4 shrink-0 self-center">
          <div class="size-8 bg-orange-400 rounded-full flex items-center justify-center font-bold">${access_rank}</div>
        </div>
        <div><h4 class="text-lg font-bold">Bible Access Rank</h4></div>
      </div>`
    : "";

  let needsRankBlock = needs_rank
    ? `<div class="flex mb-4">
        <div class="mr-4 shrink-0 self-center">
          <div class="size-8 bg-amber-400 rounded-full flex items-center justify-center font-bold">${needs_rank}</div>
        </div>
        <div><h4 class="text-lg font-bold">Bible Needs Rank</h4></div>
      </div>`
    : "";

  content.innerHTML = `
    <h2 class="text-lg font-semibold mb-4">${title}</h2>
    ${accessRankBlock}
    ${needsRankBlock}
    <div class="mb-2">
      <p><strong>Population:</strong> ${pop_total ?? "N/A"}</p>
      <p><strong>Christian Population:</strong> ${pop_christian ?? "N/A"}</p>
      <p><strong>Total Languages:</strong> ${lang_total ?? "N/A"}</p>
    </div>
    <p class="text-sm break-words mt-4">Link: <a href="${href}" class="text-blue-500 underline" target="_blank">${href}</a></p>
  `;

  document.getElementById("slideout-panel").classList.remove("translate-x-full");

  document.getElementById("slideout-close")?.addEventListener("click", () => {
    document.getElementById("slideout-panel").classList.add("translate-x-full");
  });
}
