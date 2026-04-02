import {
  ApplyVariableKey,
  clone,
  ClosestVariable,
  findLocalCollectionByName,
  findRemoteCollectionByName,
  isMatchScopeVariableAndNodeSet,
  isValidNodeType,
  isWithColorFillNodeType,
  isWithSpacingPaddingBorderRadiusNodeType,
  Message,
  mkBindableNodeField,
  mkLayout,
  rgbToHex,
  WithColorFillNode,
  WithSpacingPaddingBorderRadiusNode,
} from "./helper";

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

figma.showUI(__html__, { width: 550, height: 500 });

interface CollectionsCache {
  spacingCollectionLocal?: VariableCollection;
  borderRadiusCollectionLocal?: VariableCollection;
  iconSizesCollectionLocal?: VariableCollection;
  colorsCollectionLocal?: VariableCollection;
  borderWidthCollectionLocal?: VariableCollection;
  spacingCollectionRemote?: LibraryVariableCollection;
  borderRadiusCollectionRemote?: LibraryVariableCollection;
  iconSizesCollectionRemote?: LibraryVariableCollection;
  colorsCollectionRemote?: LibraryVariableCollection;
  baseColorsCollectionRemote?: LibraryVariableCollection;
  borderWidthCollectionRemote?: LibraryVariableCollection;
  spacingVarsRemote: Array<LibraryVariable>;
  borderRadiusVarsRemote: Array<LibraryVariable>;
  iconSizesVarsRemote: Array<LibraryVariable>;
  colorsVarsRemote: Array<LibraryVariable>;
  baseColorsVarsRemote: Array<LibraryVariable>;
  borderWidthVarsRemote: Array<LibraryVariable>;
}

let cache: CollectionsCache | null = null;

async function preloadCollections(): Promise<CollectionsCache> {
  const [collectionsRemote, collectionsLocal] = await Promise.all([
    figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync(),
    figma.variables.getLocalVariableCollectionsAsync(),
  ]);

  const spacingCollectionLocal = findLocalCollectionByName(
    "spacing",
    collectionsLocal,
  );
  const borderRadiusCollectionLocal = findLocalCollectionByName(
    "borderRadius",
    collectionsLocal,
  );
  const iconSizesCollectionLocal = findLocalCollectionByName(
    "iconSizes",
    collectionsLocal,
  );
  const colorsCollectionLocal = findLocalCollectionByName(
    "colors",
    collectionsLocal,
  );
  const borderWidthCollectionLocal = findLocalCollectionByName(
    "borderWidth",
    collectionsLocal,
  );

  const spacingCollectionRemote = findRemoteCollectionByName(
    "spacing",
    collectionsRemote,
  );
  const borderRadiusCollectionRemote = findRemoteCollectionByName(
    "borderRadius",
    collectionsRemote,
  );
  const iconSizesCollectionRemote = findRemoteCollectionByName(
    "iconSizes",
    collectionsRemote,
  );
  const colorsCollectionRemote = findRemoteCollectionByName(
    "colors",
    collectionsRemote,
  );
  const baseColorsCollectionRemote = findRemoteCollectionByName(
    "baseColors",
    collectionsRemote,
  );
  const borderWidthCollectionRemote = findRemoteCollectionByName(
    "borderWidth",
    collectionsRemote,
  );

  const [
    spacingVarsRemote,
    borderRadiusVarsRemote,
    iconSizesVarsRemote,
    colorsVarsRemote,
    baseColorsVarsRemote,
    borderWidthVarsRemote,
  ] = await Promise.all([
    spacingCollectionRemote
      ? figma.teamLibrary.getVariablesInLibraryCollectionAsync(
          spacingCollectionRemote.key,
        )
      : Promise.resolve([]),
    borderRadiusCollectionRemote
      ? figma.teamLibrary.getVariablesInLibraryCollectionAsync(
          borderRadiusCollectionRemote.key,
        )
      : Promise.resolve([]),
    iconSizesCollectionRemote
      ? figma.teamLibrary.getVariablesInLibraryCollectionAsync(
          iconSizesCollectionRemote.key,
        )
      : Promise.resolve([]),
    colorsCollectionRemote
      ? figma.teamLibrary.getVariablesInLibraryCollectionAsync(
          colorsCollectionRemote.key,
        )
      : Promise.resolve([]),
    baseColorsCollectionRemote
      ? figma.teamLibrary.getVariablesInLibraryCollectionAsync(
          baseColorsCollectionRemote.key,
        )
      : Promise.resolve([]),
    borderWidthCollectionRemote
      ? figma.teamLibrary.getVariablesInLibraryCollectionAsync(
          borderWidthCollectionRemote.key,
        )
      : Promise.resolve([]),
  ]);

  return {
    spacingCollectionLocal,
    borderRadiusCollectionLocal,
    iconSizesCollectionLocal,
    colorsCollectionLocal,
    borderWidthCollectionLocal,
    spacingCollectionRemote,
    borderRadiusCollectionRemote,
    iconSizesCollectionRemote,
    colorsCollectionRemote,
    baseColorsCollectionRemote,
    borderWidthCollectionRemote,
    spacingVarsRemote,
    borderRadiusVarsRemote,
    iconSizesVarsRemote,
    colorsVarsRemote,
    baseColorsVarsRemote,
    borderWidthVarsRemote,
  };
}

preloadCollections().then((result) => {
  cache = result;
  figma.ui.postMessage("ready");
});

figma.ui.onmessage = async (msg: Message) => {
  if (!cache) {
    figma.ui.postMessage("Collections not loaded yet, please wait...");
    return;
  }

  const {
    spacingCollectionLocal,
    borderRadiusCollectionLocal,
    iconSizesCollectionLocal,
    colorsCollectionLocal,
    borderWidthCollectionLocal,
    spacingCollectionRemote,
    borderRadiusCollectionRemote,
    iconSizesCollectionRemote,
    colorsCollectionRemote,
    baseColorsCollectionRemote,
    borderWidthCollectionRemote,
    spacingVarsRemote,
    borderRadiusVarsRemote,
    iconSizesVarsRemote,
    colorsVarsRemote,
    baseColorsVarsRemote,
    borderWidthVarsRemote,
  } = cache;

  const selection = figma.currentPage.selection;
  const feedback: Array<string> = [];

  if (msg.type === "setColorAlias") {
    feedback.push("❤︎ 🕵🏻‍♀️ ☞ : Set alias");
    if (colorsCollectionLocal && baseColorsCollectionRemote) {
      for (const variableId of colorsCollectionLocal.variableIds) {
        const localVariableById =
          await figma.variables.getVariableByIdAsync(variableId);
        if (localVariableById) {
          for (const modeId in localVariableById.valuesByMode) {
            let setAlias = false;

            const localValue: RGBA | VariableAlias = localVariableById
              .valuesByMode[modeId] as RGBA;
            // local value is VariableAlias when alias is already set
            if ("type" in localValue && localValue.type === "VARIABLE_ALIAS") {
              setAlias = true;
            }
            for (const remoteVariableId of baseColorsVarsRemote) {
              if (setAlias) break;
              const importedVariable =
                await figma.variables.importVariableByKeyAsync(
                  remoteVariableId.key,
                );
              if (importedVariable) {
                for (const remoteModeId in importedVariable.valuesByMode) {
                  const remoteValue = importedVariable.valuesByMode[
                    remoteModeId
                  ] as RGBA;
                  if (
                    localValue.r === remoteValue.r &&
                    localValue.g === remoteValue.g &&
                    localValue.b === remoteValue.b &&
                    localValue.a === remoteValue.a
                  ) {
                    localVariableById.setValueForMode(
                      modeId,
                      figma.variables.createVariableAlias(importedVariable),
                    );
                    feedback.push(
                      `🪼 Color Alias set: ${localVariableById.name} -> ${importedVariable.name}`,
                    );
                    setAlias = true;
                    break;
                  }
                }
              }
            }
          }
        }
      }
    } else {
      feedback.push(
        "❌ ⛳️LOCAL and 📚LIBRARY: Can not set alias, either no local or library color variables found",
      );
    }
  } else {
    if (selection.length === 0) {
      figma.notify("select at least one Frame or Section or Page");
      figma.ui.postMessage("!!! No selection selected");
      return;
    }

    if (msg.type === "fixLayout") {
      const spacingFetchers: VariableFetcher[] = spacingCollectionLocal
        ? spacingCollectionLocal.variableIds.map(
            (id) => () => figma.variables.getVariableByIdAsync(id),
          )
        : spacingVarsRemote.map(
            (v) => () => figma.variables.importVariableByKeyAsync(v.key),
          );
      const borderRadiusFetchers: VariableFetcher[] =
        borderRadiusCollectionLocal
          ? borderRadiusCollectionLocal.variableIds.map(
              (id) => () => figma.variables.getVariableByIdAsync(id),
            )
          : borderRadiusVarsRemote.map(
              (v) => () => figma.variables.importVariableByKeyAsync(v.key),
            );
      const paddingH = msg.paddingH ?? DEFAULT_PADDING_H;
      const paddingV = msg.paddingV ?? DEFAULT_PADDING_V;
      const borderRadius = msg.borderRadius ?? DEFAULT_BORDER_RADIUS;
      const align = msg.align ?? "CENTER";
      for (const node of selection) {
        await traverseAndFixLayout(
          node,
          spacingFetchers,
          borderRadiusFetchers,
          paddingH,
          paddingV,
          borderRadius,
          align,
          feedback,
        );
      }
    } else {
      for (const node of selection) {
        await traverseAndApply(
          node,
          {
            spacingCollectionLocal,
            borderRadiusCollectionLocal,
            iconSizesCollectionLocal,
            colorsCollectionLocal,
            borderWidthCollectionLocal,
          },
          {
            spacingCollectionRemote,
            borderRadiusCollectionRemote,
            iconSizesCollectionRemote,
            colorsCollectionRemote,
            borderWidthCollectionRemote,
          },
          {
            spacingVarsRemote,
            borderRadiusVarsRemote,
            iconSizesVarsRemote,
            colorsVarsRemote,
            borderWidthVarsRemote,
          },
          feedback,
          msg,
        );
      }
    }
  }

  figma.ui.postMessage(feedback.join("\n"));
};

interface CollectionLocal {
  spacingCollectionLocal?: VariableCollection;
  borderRadiusCollectionLocal?: VariableCollection;
  iconSizesCollectionLocal?: VariableCollection;
  colorsCollectionLocal?: VariableCollection;
  borderWidthCollectionLocal?: VariableCollection;
}
interface CollectionRemote {
  spacingCollectionRemote?: LibraryVariableCollection;
  borderRadiusCollectionRemote?: LibraryVariableCollection;
  iconSizesCollectionRemote?: LibraryVariableCollection;
  colorsCollectionRemote?: LibraryVariableCollection;
  borderWidthCollectionRemote?: LibraryVariableCollection;
}
interface RemoteVars {
  spacingVarsRemote: Array<LibraryVariable>;
  borderRadiusVarsRemote: Array<LibraryVariable>;
  iconSizesVarsRemote: Array<LibraryVariable>;
  colorsVarsRemote: Array<LibraryVariable>;
  borderWidthVarsRemote: Array<LibraryVariable>;
}

const DEFAULT_PADDING_H = 16;
const DEFAULT_PADDING_V = 16;
const DEFAULT_BORDER_RADIUS = 16;

async function findVariableClosestTo(
  value: number,
  fetchers: VariableFetcher[],
): Promise<Variable | null> {
  let best: { variable: Variable; diff: number } | null = null;
  for (const fetch of fetchers) {
    const variable = await fetch();
    if (!variable) continue;
    for (const modeId in variable.valuesByMode) {
      const v = variable.valuesByMode[modeId] as number;
      if (v === value) return variable;
      const diff = Math.abs(v - value);
      if (!best || diff < best.diff) best = { variable, diff };
    }
  }
  return best?.variable ?? null;
}

async function traverseAndFixLayout(
  node: SceneNode,
  spacingFetchers: Array<VariableFetcher>,
  borderRadiusFetchers: Array<VariableFetcher>,
  paddingH: number,
  paddingV: number,
  borderRadius: number,
  align: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN",
  feedback: Array<string>,
) {
  if (
    (node.type === "FRAME" || node.type === "COMPONENT") &&
    "children" in node &&
    node.children.length > 0
  ) {
    const direction = node.width >= node.height ? "HORIZONTAL" : "VERTICAL";
    node.layoutMode = direction;
    node.primaryAxisSizingMode = "AUTO";
    node.counterAxisSizingMode = "AUTO";
    node.primaryAxisAlignItems = align;
    node.counterAxisAlignItems = align === "SPACE_BETWEEN" ? "MIN" : align;
    node.paddingLeft = paddingH;
    node.paddingRight = paddingH;
    node.paddingTop = paddingV;
    node.paddingBottom = paddingV;
    node.topLeftRadius = borderRadius;
    node.topRightRadius = borderRadius;
    node.bottomLeftRadius = borderRadius;
    node.bottomRightRadius = borderRadius;

    const [paddingHVar, paddingVVar, borderRadiusVar] = await Promise.all([
      findVariableClosestTo(paddingH, spacingFetchers),
      findVariableClosestTo(paddingV, spacingFetchers),
      findVariableClosestTo(borderRadius, borderRadiusFetchers),
    ]);

    if (paddingHVar) {
      node.setBoundVariable("paddingLeft", paddingHVar);
      node.setBoundVariable("paddingRight", paddingHVar);
    }
    if (paddingVVar) {
      node.setBoundVariable("paddingTop", paddingVVar);
      node.setBoundVariable("paddingBottom", paddingVVar);
    }
    if (borderRadiusVar) {
      node.setBoundVariable("topLeftRadius", borderRadiusVar);
      node.setBoundVariable("topRightRadius", borderRadiusVar);
      node.setBoundVariable("bottomLeftRadius", borderRadiusVar);
      node.setBoundVariable("bottomRightRadius", borderRadiusVar);
    }

    feedback.push(
      `🔧 Fix layout ✓!!! 【${node.name}】 → ${direction} auto-layout` +
        `\n   paddingH: ${paddingH}${paddingHVar ? ` → ${paddingHVar.name}` : " (no variable found)"}` +
        `\n   paddingV: ${paddingV}${paddingVVar ? ` → ${paddingVVar.name}` : " (no variable found)"}` +
        `\n   borderRadius: ${borderRadius}${borderRadiusVar ? ` → ${borderRadiusVar.name}` : " (no variable found)"}`,
    );
  } else if ("layoutMode" in node && node.layoutMode !== "NONE") {
    feedback.push(`⏭️ 【${node.name}】 already has auto-layout, skipped`);
  }

  if ("children" in node) {
    for (const child of node.children) {
      await traverseAndFixLayout(
        child,
        spacingFetchers,
        borderRadiusFetchers,
        paddingH,
        paddingV,
        borderRadius,
        align,
        feedback,
      );
    }
  }
}

async function traverseAndApply(
  node: SceneNode,
  collectionsLocal: CollectionLocal,
  collectionsRemote: CollectionRemote,
  remoteVars: RemoteVars,
  feedback: Array<string>,
  msg: Message,
) {
  feedback.push(
    `❤︎ 🕵🏻‍♀️ ☞ Apply variables: Node Name:【 ${node.name} 】 ✶ Type: 「 ${node.type} 」`,
  );

  const {
    spacingCollectionLocal,
    borderRadiusCollectionLocal,
    iconSizesCollectionLocal,
    colorsCollectionLocal,
    borderWidthCollectionLocal,
  } = collectionsLocal;
  const {
    spacingCollectionRemote,
    borderRadiusCollectionRemote,
    colorsCollectionRemote,
    iconSizesCollectionRemote,
    borderWidthCollectionRemote,
  } = collectionsRemote;
  const {
    spacingVarsRemote,
    borderRadiusVarsRemote,
    iconSizesVarsRemote,
    colorsVarsRemote,
    borderWidthVarsRemote,
  } = remoteVars;

  if (isValidNodeType(node)) {
    mkLayout(node);

    // apply layout variables
    if (msg.type === "getLayoutSpecifications") {
      if (isWithSpacingPaddingBorderRadiusNodeType(node)) {
        if (!spacingCollectionLocal && !spacingCollectionRemote) {
          feedback.push(
            "❌ ⛳️LOCAL and 📚LIBRARY: No spacing variable collection found",
          );
        } else {
          const spacingFetchers: Array<VariableFetcher> = spacingCollectionLocal
            ? spacingCollectionLocal.variableIds.map(
                (id) => () => figma.variables.getVariableByIdAsync(id),
              )
            : spacingVarsRemote.map(
                (v) => () => figma.variables.importVariableByKeyAsync(v.key),
              );
          const spacingSource = spacingCollectionLocal
            ? "⛳️ LOCAL"
            : "📚 LIBRARY";
          await applyLayoutVariables(
            node,
            spacingFetchers,
            feedback,
            "spacing",
            spacingSource,
          );
        }

        if (!borderRadiusCollectionLocal && !borderRadiusCollectionRemote) {
          feedback.push(
            "❌ ⛳️LOCAL and 📚LIBRARY: No borderRadius variable collection found",
          );
        } else {
          const borderRadiusFetchers: Array<VariableFetcher> =
            borderRadiusCollectionLocal
              ? borderRadiusCollectionLocal.variableIds.map(
                  (id) => () => figma.variables.getVariableByIdAsync(id),
                )
              : borderRadiusVarsRemote.map(
                  (v) => () => figma.variables.importVariableByKeyAsync(v.key),
                );
          const borderRadiusSource = borderRadiusCollectionLocal
            ? "⛳️ LOCAL"
            : "📚 LIBRARY";
          await applyLayoutVariables(
            node,
            borderRadiusFetchers,
            feedback,
            "borderRadius",
            borderRadiusSource,
          );
        }

        if (!borderWidthCollectionLocal && !borderWidthCollectionRemote) {
          feedback.push(
            "❌ ⛳️LOCAL and 📚LIBRARY: No borderWidth variable collection found",
          );
        } else {
          const borderWidthFetchers: Array<VariableFetcher> =
            borderWidthCollectionLocal
              ? borderWidthCollectionLocal.variableIds.map(
                  (id) => () => figma.variables.getVariableByIdAsync(id),
                )
              : borderWidthVarsRemote.map(
                  (v) => () => figma.variables.importVariableByKeyAsync(v.key),
                );
          const borderWidthSource = borderWidthCollectionLocal
            ? "⛳️ LOCAL"
            : "📚 LIBRARY";
          await applyLayoutVariables(
            node,
            borderWidthFetchers,
            feedback,
            "borderWidth",
            borderWidthSource,
          );
        }

        if (node.name.includes("icon/")) {
          if (!iconSizesCollectionLocal && !iconSizesCollectionRemote) {
            feedback.push(
              "❌ ⛳️LOCAL and 📚LIBRARY: No iconSizes variable collection found",
            );
          } else {
            const iconSizesFetchers: Array<VariableFetcher> =
              iconSizesCollectionLocal
                ? iconSizesCollectionLocal.variableIds.map(
                    (id) => () => figma.variables.getVariableByIdAsync(id),
                  )
                : iconSizesVarsRemote.map(
                    (v) => () =>
                      figma.variables.importVariableByKeyAsync(v.key),
                  );
            const iconSizesSource = iconSizesCollectionLocal
              ? "⛳️ LOCAL"
              : "📚 LIBRARY";
            await applyLayoutVariables(
              node,
              iconSizesFetchers,
              feedback,
              "iconSizes",
              iconSizesSource,
            );
          }
        } else {
          feedback.push(
            "🙈🙈 Not an icon node, skip iconSizes variable application",
          );
        }
      } else {
        feedback.push(
          "‼️ No spacing & padding & border radius in node layout specification",
        );
      }
    }

    // apply colors
    if (msg.type === "getColorSpecifications") {
      if (isWithColorFillNodeType(node)) {
        if (!colorsCollectionLocal && !colorsCollectionRemote) {
          feedback.push("❌ ⛳️LOCAL and 📚LIBRARY: No colors collection found");
        } else {
          const colorsFetchers: Array<VariableFetcher> = colorsCollectionLocal
            ? colorsCollectionLocal.variableIds.map(
                (id) => () => figma.variables.getVariableByIdAsync(id),
              )
            : colorsVarsRemote.map(
                (v) => () => figma.variables.importVariableByKeyAsync(v.key),
              );
          const colorsSource = colorsCollectionLocal
            ? "⛳️ LOCAL"
            : "📚 LIBRARY";
          await applyColorsVariable(
            node,
            colorsFetchers,
            feedback,
            colorsSource,
          );
        }
      } else {
        feedback.push("‼️ No colors in node layout specification");
      }
    }
  } else {
    feedback.push(
      "❌ Invalid node type. Valid node types are FRAME| COMPONENT | INSTANCE | SECTION | GROUP | RECTANGLE | TEXT | ELLIPSE | VECTOR.",
    );
  }

  if ("children" in node) {
    for (const child of node.children) {
      await traverseAndApply(
        child,
        collectionsLocal,
        collectionsRemote,
        remoteVars,
        feedback,
        msg,
      );
    }
  }
}

type VariableFetcher = () => Promise<Variable | null>;

async function applyLayoutVariables(
  node: WithSpacingPaddingBorderRadiusNode,
  fetchers: Array<VariableFetcher>,
  msg: Array<string>,
  key: ApplyVariableKey,
  source: string,
) {
  const bindableNodeField = mkBindableNodeField(key);
  const msgTitle = key.toUpperCase();

  for (const attribute of bindableNodeField) {
    let appliedVariable = false;
    let closestVariable: ClosestVariable | undefined = undefined;

    const nodeValue = node[attribute];

    if (nodeValue === 0) {
      appliedVariable = true;
    } else {
      for (const fetch of fetchers) {
        if (appliedVariable) break;
        const variable = await fetch();
        if (variable) {
          for (const modeId in variable.valuesByMode) {
            const value = variable.valuesByMode[modeId];
            if (value === nodeValue) {
              node.setBoundVariable(attribute, variable);
              msg.push(
                `${source}: ${msgTitle} ✓!!! ${attribute}(${nodeValue}) - ${variable.name}(${value})`,
              );
              appliedVariable = true;
              break;
            } else {
              const valueDifference = Math.abs((value as number) - nodeValue);
              if (
                !closestVariable ||
                valueDifference < closestVariable.valueDifference
              ) {
                closestVariable = {
                  v: variable,
                  valueDifference,
                  newValue: value as number,
                  originalValue: nodeValue,
                };
              }
            }
          }
        }
      }
      if (closestVariable && !appliedVariable) {
        node.setBoundVariable(attribute, closestVariable.v);
        msg.push(
          `${source}: ${msgTitle} ✓!!! ${attribute}(${closestVariable.originalValue}) - ${closestVariable.v.name}(${closestVariable.newValue}) applied as closest value !!!`,
        );
        appliedVariable = true;
      }
    }
    if (!appliedVariable) {
      msg.push(
        `${source}: ${msgTitle} ⁉️!!! ${attribute} - ${nodeValue} can not find equal variable`,
      );
    }
  }
}

async function applyColorsVariable(
  node: WithColorFillNode,
  fetchers: Array<VariableFetcher>,
  msg: Array<string>,
  source: string,
) {
  const fillsCopy = clone(node.fills);
  let appliedVariable = false;

  if (fillsCopy[0] && fillsCopy[0].type === "SOLID") {
    for (const fetch of fetchers) {
      if (appliedVariable) break;
      const variable = await fetch();
      if (variable) {
        if (!isMatchScopeVariableAndNodeSet(node, variable)) {
          continue;
        }
        await applyColorVariable(
          node,
          variable,
          msg,
          fillsCopy,
          () => {
            appliedVariable = true;
          },
          source,
        );
      }
    }
  } else {
    msg.push(
      `${source}: Fills 🙈🙈 ${
        fillsCopy[0] === undefined
          ? "No fills"
          : fillsCopy[0].type !== "SOLID"
            ? "Not solid fill type"
            : "Unknown getting fills error"
      }`,
    );
  }
  if (!appliedVariable) {
    msg.push(
      `${source}: Fills ⁉️!!! ${fillsCopy} -  can not find equal variable`,
    );
  }
}

async function applyColorVariable(
  node: WithColorFillNode,
  variableById: Variable,
  msg: Array<string>,
  fillsCopy: any,
  onAppliedVariable: () => void,
  msgHeader: string,
) {
  const originalColor = fillsCopy[0].color;
  let appliedLocal = false;

  for (const variableModeId in variableById.valuesByMode) {
    if (appliedLocal) break;
    const value = variableById.valuesByMode[variableModeId] as
      | RGBA
      | VariableAlias;
    if ("type" in value && value.type === "VARIABLE_ALIAS") {
      const target = await figma.variables.getVariableByIdAsync(value.id);
      let appliedFromAliasLocal = false;
      for (const valueModeId in target?.valuesByMode) {
        if (appliedFromAliasLocal) break;
        const aliasValue = target?.valuesByMode[valueModeId] as RGBA;
        await checkAndBoundColorVariable(
          node,
          variableById,
          msg,
          fillsCopy,
          originalColor,
          aliasValue,
          () => {
            appliedFromAliasLocal = true;
            appliedLocal = true;
            onAppliedVariable();
          },
          msgHeader,
        );
      }
    } else if (
      typeof value === "object" &&
      "r" in value &&
      "g" in value &&
      "b" in value &&
      "a" in value
    ) {
      await checkAndBoundColorVariable(
        node,
        variableById,
        msg,
        fillsCopy,
        originalColor,
        value,
        () => {
          appliedLocal = true;
          onAppliedVariable();
        },
        msgHeader,
      );
    }
  }
}

async function checkAndBoundColorVariable(
  node: WithColorFillNode,
  variableById: Variable,
  msg: Array<string>,
  fillsCopy: any,
  originalColor: any,
  targetValue: RGBA,
  onAppliedVariable: () => void,
  msgHeader: string,
) {
  if (
    targetValue.r === originalColor.r &&
    targetValue.g === originalColor.g &&
    targetValue.b === originalColor.b &&
    targetValue.a === (originalColor.a ?? 1)
  ) {
    fillsCopy[0] = figma.variables.setBoundVariableForPaint(
      fillsCopy[0],
      "color",
      variableById,
    );
    node.fills = fillsCopy;
    msg.push(
      `${msgHeader}: Fills ✓!!! ${rgbToHex(originalColor)} - ${variableById.name}(${rgbToHex(targetValue)})`,
    );
    onAppliedVariable();
  }
}
