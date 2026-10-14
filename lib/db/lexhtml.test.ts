import { describe, expect, it } from "vitest";
import { sanitizeLexicon } from "./lexhtml";

describe("sanitizeLexicon", () => {
  it("turns STEP <ref> tags into verse links", () => {
    expect(sanitizeLexicon("see <ref='Jhn.13.35'>Jhn.13:35;</ref>")).toBe('see <a href="/verse/Jhn.13.35">Jhn.13:35;</a>');
  });
  it("keeps the first ref of a multi-ref tag", () => {
    expect(sanitizeLexicon("<ref='2Co.11.1; 11.19'>2Co.11:1 11:19</ref>")).toBe('<a href="/verse/2Co.11.1">2Co.11:1 11:19</a>');
  });
  it("keeps simple formatting and drops everything else", () => {
    expect(sanitizeLexicon('<b>love</b><BR /><i>x</i><script>alert(1)</script><span onclick="x">y</span>')).toBe(
      "<b>love</b><br><i>x</i>alert(1)y",
    );
  });
  it("normalises the __ indentation markers", () => {
    expect(sanitizeLexicon("<BR />__1. <b>Of men</b>")).toBe("<br>1. <b>Of men</b>");
  });
});
