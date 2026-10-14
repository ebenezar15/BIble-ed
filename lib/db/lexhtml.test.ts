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

  it("filters markup inside ref text", () => {
    expect(sanitizeLexicon("<ref='Jhn.1.1'><img src=x onerror=alert(1)>John</ref>")).toBe('<a href="/verse/Jhn.1.1">John</a>');
  });
  it("normalises ranges, colons and single-chapter refs", () => {
    expect(sanitizeLexicon("<ref='Gen.4.2-10'>Gen.4:2-10</ref>")).toBe('<a href="/verse/Gen.4.2">Gen.4:2-10</a>');
    expect(sanitizeLexicon("<ref='Jhn.8:7'>x</ref>")).toBe('<a href="/verse/Jhn.8.7">x</a>');
    expect(sanitizeLexicon("<ref='3Jn.11'>3 Jn 11</ref>")).toBe('<a href="/verse/3Jn.1.11">3 Jn 11</a>');
    expect(sanitizeLexicon("<ref='Jude.24'>Ju 24</ref>")).toBe('<a href="/verse/Jud.1.24">Ju 24</a>');
  });
  it("leaves refs outside the 66-book canon as plain text", () => {
    expect(sanitizeLexicon("<ref='Tob.12.13'>Tob.12:13</ref>")).toBe("Tob.12:13");
    expect(sanitizeLexicon("<ref='3Ki.14.1'>3Ki</ref>")).toBe("3Ki");
  });
});
