import {
  ApplyVariableKey,
  clone,
  ClosestVariable,
  findLocalCollectionByName,
  findRemoteCollectionByName,
  getDesignSystemComponents,
  isMatchScopeVariableAndNodeSet,
  isValidInstance,
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

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 550, height: 500 });

figma.ui.onmessage = async (msg: Message) => {
  const selection = figma.currentPage.selection;

  const collectionsRemote =
    await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
  const collectionsLocal =
    await figma.variables.getLocalVariableCollectionsAsync();

  const spacingCollectionLocal = findLocalCollectionByName(
    "spacing",
    collectionsLocal
  );
  const borderRadiusCollectionLocal = findLocalCollectionByName(
    "borderRadius",
    collectionsLocal
  );
  const iconSizesCollectionLocal = findLocalCollectionByName(
    "iconSizes",
    collectionsLocal
  );
  const colorsCollectionLocal = findLocalCollectionByName(
    "colors",
    collectionsLocal
  );

  const spacingCollectionRemote = findRemoteCollectionByName(
    "spacing",
    collectionsRemote
  );
  const borderRadiusCollectionRemote = findRemoteCollectionByName(
    "borderRadius",
    collectionsRemote
  );
  const iconSizesCollectionRemote = findRemoteCollectionByName(
    "iconSizes",
    collectionsRemote
  );
  const colorsCollectionRemote = findRemoteCollectionByName(
    "baseColors",
    collectionsRemote
  );

  const feedback: Array<string> = [];

  if (msg.type === "setColorAlias") {
    feedback.push("❤︎ 🕵🏻‍♀️ ☞ : Set alias");
    if (colorsCollectionLocal && colorsCollectionRemote) {
      const colorsCollectionsLib =
        await figma.teamLibrary.getVariablesInLibraryCollectionAsync(
          colorsCollectionRemote.key
        );
      for (const variableId of colorsCollectionLocal.variableIds) {
        const localVariableById = await figma.variables.getVariableByIdAsync(
          variableId
        );
        if (localVariableById) {
          for (const modeId in localVariableById.valuesByMode) {
            let setAlias = false;

            const localValue: RGBA | VariableAlias = localVariableById
              .valuesByMode[modeId] as RGBA;
            // local value is VariableAlias when alias is already set
            if ("type" in localValue && localValue.type === "VARIABLE_ALIAS") {
              setAlias = true;
            }
            for (const remoteVariableId of colorsCollectionsLib) {
              if (setAlias) {
                break;
              }
              const importedVariable =
                await figma.variables.importVariableByKeyAsync(
                  remoteVariableId.key
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
                      figma.variables.createVariableAlias(importedVariable)
                    );
                    feedback.push(
                      `🪼 Color Alias set: ${localVariableById.name} -> ${importedVariable.name}`
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
        "❌ ⛳️LOCAL and 📚LIBRARY: Can not set alias, either no local or library color variables found"
      );
    }
  } else {
    if (selection.length === 0) {
      figma.notify("select at least one Frame or Section or Page");
      figma.ui.postMessage("!!! No selection selected");
      return;
    }
    if (msg.type === "swapComponent") {
      const getNativeDesignSystemRes = await getDesignSystemComponents(
        "fake_file_key_replace_with_your_own_token"
      );
      for (const node of selection) {
        await swapComponent(
          node,
          feedback,
          getNativeDesignSystemRes.meta.components
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
          },
          {
            spacingCollectionRemote,
            borderRadiusCollectionRemote,
            iconSizesCollectionRemote,
            colorsCollectionRemote,
          },
          feedback,
          msg
        );
      }
    }
  }

  figma.ui.postMessage(feedback.join("\n"));
};

async function swapComponent(
  node: SceneNode,
  feedback: Array<string>,
  components: Array<{ name: string; key: string; node_id: string }>
) {
  feedback.push(
    `❤︎ 🕵🏻‍♀️ ☞ Swap component: Node Name:【 ${node.name} 】 ✶ Type: 「 ${node.type} 」`
  );
  console.log("selectedNode", node.name, node.type);

  if (isValidInstance(node)) {
    const mainComponent = (await node.getMainComponentAsync()) as ComponentNode;
    // await node.swapComponent()
    // const getLunarDesignSystemRes = await getDesignSystemComponents(
    //   LUNAR_DESIGN_SYSTEM_FILE_KEY
    // );
    // const getNativeDesignSystemRes = await getDesignSystemComponents(
    //   NATIVE_DESIGN_SYSTEM_FILE_KEY
    // );
    // const allLunarDesignSystemIcons =
    //   getLunarDesignSystemRes.meta.components.filter((c: any) =>
    //     c.name.includes("icon/")
    //   );
    const iconFromNativeDesignSystem = components.filter(
      (c: any) =>
        c.name.includes("icon/") &&
        (c.name.replace("icon/", "baseIcon/") === node.name ||
          c.name === node.name)
    );

    console.log("MainComponent:", JSON.stringify(mainComponent));
    console.log(
      "iconFromNativeDesignSystem:",
      JSON.stringify(iconFromNativeDesignSystem)
    );

    if (iconFromNativeDesignSystem.length > 0) {
      if (iconFromNativeDesignSystem[0].node_id === mainComponent.id) {
        feedback.push(
          `🥑 Swap component 🍉🍉!!! ${node.name} is already using the native design system component`
        );
      } else {
        const getIconAsComponent = (await figma.importComponentByKeyAsync(
          iconFromNativeDesignSystem[0].key
        )) as ComponentNode;

        console.log(
          "getIconAsComponent:",
          JSON.stringify(getIconAsComponent),
          getIconAsComponent?.name,
          getIconAsComponent?.remote
        );

        await node.swapComponent(getIconAsComponent);
        feedback.push(
          `🥑 Swap component ✓!!!swapped to -> ${getIconAsComponent.name}`
        );
      }
    } else {
      feedback.push(
        `🥑 Swap component ❌❌!!!cant find icon from Lunar native Library for ${node.name}`
      );
    }
    //
  } else {
    feedback.push("❌ Invalid node type. Valid node types are INSTANCE");
  }
}

interface CollectionLocal {
  spacingCollectionLocal?: VariableCollection;
  borderRadiusCollectionLocal?: VariableCollection;
  iconSizesCollectionLocal?: VariableCollection;
  colorsCollectionLocal?: VariableCollection;
}
interface CollectionRemote {
  spacingCollectionRemote?: LibraryVariableCollection;
  borderRadiusCollectionRemote?: LibraryVariableCollection;
  iconSizesCollectionRemote?: LibraryVariableCollection;
  colorsCollectionRemote?: LibraryVariableCollection;
}

async function traverseAndApply(
  node: SceneNode,
  collectionsLocal: CollectionLocal,
  collectionsRemote: CollectionRemote,
  feedback: Array<string>,
  msg: Message
) {
  feedback.push(
    `❤︎ 🕵🏻‍♀️ ☞ Apply variables: Node Name:【 ${node.name} 】 ✶ Type: 「 ${node.type} 」`
  );

  const {
    spacingCollectionLocal,
    borderRadiusCollectionLocal,
    iconSizesCollectionLocal,
    colorsCollectionLocal,
  } = collectionsLocal;
  const {
    spacingCollectionRemote,
    borderRadiusCollectionRemote,
    colorsCollectionRemote,
    iconSizesCollectionRemote,
  } = collectionsRemote;

  if (isValidNodeType(node)) {
    const layoutInfo = mkLayout(node);
    console.log(
      "Node Name:",
      node.name,
      "- layoutInfo:",
      JSON.stringify(layoutInfo)
    );

    //apply layout variables
    if (msg.type === "getLayoutSpecifications") {
      if (isWithSpacingPaddingBorderRadiusNodeType(node)) {
        if (!spacingCollectionLocal) {
          if (!spacingCollectionRemote) {
            feedback.push(
              "❌ ⛳️LOCAL and 📚LIBRARY: No spacing variable collection found"
            );
            return;
          } else {
            await applyLibraryVariables(
              node,
              spacingCollectionRemote,
              feedback,
              "spacing"
            );
          }
        } else {
          await applyLocalVariables(
            node,
            spacingCollectionLocal,
            feedback,
            "spacing"
          );
        }

        if (!borderRadiusCollectionLocal) {
          if (!borderRadiusCollectionRemote) {
            feedback.push(
              "❌ ⛳️LOCAL and 📚LIBRARY: No borderRadius variable collection found"
            );
            return;
          } else {
            await applyLibraryVariables(
              node,
              borderRadiusCollectionRemote,
              feedback,
              "borderRadius"
            );
          }
        } else {
          await applyLocalVariables(
            node,
            borderRadiusCollectionLocal,
            feedback,
            "borderRadius"
          );
        }

        if (node.name.includes("icon/")) {
          if (!iconSizesCollectionLocal) {
            if (!iconSizesCollectionRemote) {
              feedback.push(
                "❌ ⛳️LOCAL and 📚LIBRARY: No iconSizes variable collection found"
              );
              return;
            } else {
              await applyLibraryVariables(
                node,
                iconSizesCollectionRemote,
                feedback,
                "iconSizes"
              );
            }
          } else {
            await applyLocalVariables(
              node,
              iconSizesCollectionLocal,
              feedback,
              "iconSizes"
            );
          }
        } else {
          feedback.push(
            "🙈🙈 Not an icon node, skip iconSizes variable application"
          );
        }

        //
      } else {
        feedback.push(
          "‼️ No spacing & padding & border radius in node layout specification"
        );
      }
    }

    //apply colors
    if (msg.type === "getColorSpecifications") {
      if (isWithColorFillNodeType(node)) {
        if (!colorsCollectionLocal) {
          if (!colorsCollectionRemote) {
            feedback.push(
              "❌ ⛳️LOCAL and 📚LIBRARY: No colors collection found"
            );
            return;
          } else {
            await applyColorsLibraryVariable(
              node,
              colorsCollectionRemote,
              feedback
            );
          }
        } else {
          await applyColorsLocalVariable(node, colorsCollectionLocal, feedback);
        }
      } else {
        feedback.push("‼️ No colors in node layout specification");
      }
    }

    //
  } else {
    feedback.push(
      "❌ Invalid node type. Valid node types are FRAME| COMPONENT | INSTANCE | SECTION | GROUP | RECTANGLE | TEXT | ELLIPSE | VECTOR."
    );
  }

  if ("children" in node) {
    for (const child of node.children) {
      await traverseAndApply(
        child,
        collectionsLocal,
        collectionsRemote,
        feedback,
        msg
      );
    }
  }
}

async function applyLibraryVariables(
  node: WithSpacingPaddingBorderRadiusNode,
  collectionRemote: LibraryVariableCollection,
  msg: Array<string>,
  key: ApplyVariableKey
) {
  const collectionsByKey =
    await figma.teamLibrary.getVariablesInLibraryCollectionAsync(
      collectionRemote.key
    );

  const bindableNodeField = mkBindableNodeField(key);
  const msgTitle = key.toUpperCase();

  for (const attribute of bindableNodeField) {
    let appliedVariable = false;
    let closestVariable: ClosestVariable | undefined = undefined;

    // if the attribute is 0, we can dont need to apply variable
    if ((node[attribute] as number) === 0) {
      appliedVariable = true;
    } else {
      for (const variableId of collectionsByKey) {
        if (appliedVariable) {
          break;
        }
        const importedVariable = await figma.variables.importVariableByKeyAsync(
          variableId.key
        );
        if (importedVariable) {
          for (const modeId in importedVariable.valuesByMode) {
            const value = importedVariable.valuesByMode[modeId];

            if (value === node[attribute]) {
              node.setBoundVariable(attribute, importedVariable);
              msg.push(
                `📚 LIBRARY: ${msgTitle} ✓!!! ${attribute}(${node[attribute]}) - ${importedVariable.name}(${value})`
              );
              appliedVariable = true;
              break;
            } else {
              const valueDifference = Math.abs(
                (value as number) - node[attribute]
              );
              if (
                !closestVariable ||
                valueDifference < closestVariable.valueDifference
              ) {
                closestVariable = {
                  v: importedVariable,
                  valueDifference,
                  newValue: value as number,
                  originalValue: node[attribute],
                };
              }
            }
          }
        }
      }
      if (closestVariable && !appliedVariable) {
        node.setBoundVariable(attribute, closestVariable.v);
        msg.push(
          `📚 LIBRARY: ${msgTitle} ✓!!! ${attribute}(${closestVariable.originalValue}) - ${closestVariable.v.name}(${closestVariable.newValue}) applied as closest value !!!`
        );
        appliedVariable = true;
      }
    }
    if (!appliedVariable) {
      msg.push(
        `📚 LIBRARY: ${msgTitle} ⁉️!!! ${attribute} - ${node[attribute]} can not find equal variable`
      );
    }
  }
}

async function applyLocalVariables(
  node: WithSpacingPaddingBorderRadiusNode,
  collectionLocal: VariableCollection,
  msg: Array<string>,
  key: ApplyVariableKey
) {
  const bindableNodeField = mkBindableNodeField(key);
  const msgTitle = key.toUpperCase();

  for (const attribute of bindableNodeField) {
    let appliedVariable = false;
    let closestVariable: ClosestVariable | undefined = undefined;

    // if the attribute is 0, we can dont need to apply variable
    if (node[attribute] === 0) {
      appliedVariable = true;
    } else {
      for (const variableId of collectionLocal.variableIds) {
        if (appliedVariable) {
          break;
        }
        const variableById = await figma.variables.getVariableByIdAsync(
          variableId
        );
        if (variableById) {
          for (const modeId in variableById.valuesByMode) {
            const value = variableById.valuesByMode[modeId];
            if (value === node[attribute]) {
              node.setBoundVariable(attribute, variableById);
              msg.push(
                `⛳️ LOCAL: ${msgTitle} ✓!!! ${attribute} - ${variableById.name}(${value})`
              );
              appliedVariable = true;
              break;
            } else {
              const valueDifference = Math.abs(
                (value as number) - node[attribute]
              );
              if (
                !closestVariable ||
                valueDifference < closestVariable.valueDifference
              ) {
                closestVariable = {
                  v: variableById,
                  valueDifference,
                  newValue: value as number,
                  originalValue: node[attribute],
                };
              }
            }
          }
        }
      }
      if (closestVariable && !appliedVariable) {
        node.setBoundVariable(attribute, closestVariable.v);
        msg.push(
          `⛳️ LOCAL: ${msgTitle} ✓!!! ${attribute}(${closestVariable.originalValue}) - ${closestVariable.v.name}(${closestVariable.newValue}) applied as closest value !!!`
        );
        appliedVariable = true;
      }
    }
    if (!appliedVariable) {
      msg.push(
        `⛳️ LOCAL: ${msgTitle} ⁉️!!! ${attribute}(${node[attribute]}) - ${node[attribute]} can not find equal variable`
      );
    }
  }
}

async function applyColorsLibraryVariable(
  node: WithColorFillNode,
  collectionRemote: LibraryVariableCollection,
  msg: Array<string>
) {
  const fillsCopy = clone(node.fills);
  const collectionsByKey =
    await figma.teamLibrary.getVariablesInLibraryCollectionAsync(
      collectionRemote.key
    );

  let appliedVariable = false;
  if (fillsCopy[0] && fillsCopy[0].type === "SOLID") {
    for (const variableId of collectionsByKey) {
      if (appliedVariable) {
        break;
      }
      const importedVariable = await figma.variables.importVariableByKeyAsync(
        variableId.key
      );
      if (importedVariable) {
        if (!isMatchScopeVariableAndNodeSet(node, importedVariable)) {
          console.log("variable scope does not fit");
        } else {
          await applyColorVariable(
            node,
            importedVariable,
            msg,
            fillsCopy,
            () => {
              appliedVariable = true;
            },
            "📚 LIBRARY"
          );
        }
      }
    }
  } else {
    msg.push(
      `📚 LIBRARY: Fills 🙈🙈 ${
        fillsCopy[0] === undefined
          ? "No fills"
          : fillsCopy[0].type !== "SOLID"
          ? "Not solid fill type"
          : "Unknown getting fills error"
      }`
    );
  }
  if (!appliedVariable) {
    msg.push(
      `📚 LIBRARY: Fills ⁉️!!! ${fillsCopy} -  can not find equal variable`
    );
  }
}

async function applyColorsLocalVariable(
  node: WithColorFillNode,
  collectionLocal: VariableCollection,
  msg: Array<string>
) {
  const fillsCopy = clone(node.fills);
  let appliedVariable = false;

  if (fillsCopy[0] && fillsCopy[0].type === "SOLID") {
    for (const variableId of collectionLocal.variableIds) {
      if (appliedVariable) {
        break;
      }
      const variableById = await figma.variables.getVariableByIdAsync(
        variableId
      );

      if (variableById) {
        if (!isMatchScopeVariableAndNodeSet(node, variableById)) {
          console.log("variable scope does not fit");
        } else {
          await applyColorVariable(
            node,
            variableById,
            msg,
            fillsCopy,
            () => {
              appliedVariable = true;
            },
            "⛳️ LOCAL"
          );
        }
      }
    }
  } else {
    msg.push(
      `⛳️ LOCAL: Fills 🙈🙈 ${
        fillsCopy[0] === undefined
          ? "No fills"
          : fillsCopy[0].type !== "SOLID"
          ? "Not solid fill type"
          : "Unknown getting fills error"
      }`
    );
  }
  if (!appliedVariable) {
    msg.push(
      `⛳️ LOCAL: Fills ⁉️!!! ${fillsCopy} -  can not find equal variable`
    );
  }
}

async function applyColorVariable(
  node: WithColorFillNode,
  variableById: Variable,
  msg: Array<string>,
  fillsCopy: any,
  onAppliedVariable: () => void,
  msgHeader: string
) {
  const originalColor = fillsCopy[0].color;
  let appliedLocal = false;

  for (const modeId in variableById.valuesByMode) {
    if (appliedLocal) {
      break;
    }
    const value = variableById.valuesByMode[modeId] as RGBA | VariableAlias;
    if ("type" in value && value.type === "VARIABLE_ALIAS") {
      const target = await figma.variables.getVariableByIdAsync(value.id);
      let appliedFromAliasLocal = false;
      for (const modeId in target?.valuesByMode) {
        if (appliedFromAliasLocal) {
          break;
        }
        const aliasValue = target?.valuesByMode[modeId] as RGBA;
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
          msgHeader
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
        msgHeader
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
  msgHeader: string
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
      variableById
    );
    node.fills = fillsCopy;
    msg.push(
      `${msgHeader}: Fills ✓!!! ${rgbToHex(originalColor)} - ${
        variableById.name
      }(${rgbToHex(targetValue)})`
    );
    onAppliedVariable();
  }
}
