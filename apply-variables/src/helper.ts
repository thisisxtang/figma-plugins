interface GetLayout {
  type: "getLayoutSpecifications";
}
interface GetColors {
  type: "getColorSpecifications";
}
interface SetColorAlias {
  type: "setColorAlias";
}
interface SwapComponent {
  type: "swapComponent";
}
export type Message = GetLayout | GetColors | SetColorAlias | SwapComponent;

export const findLocalCollectionByName = (
  name: string,
  collectionsLocal: Array<VariableCollection>
) => collectionsLocal.find((c) => c.name === name);

export const findRemoteCollectionByName = (
  name: string,
  collectionsRemote: Array<LibraryVariableCollection>
) => collectionsRemote.find((c) => c.name === name);

type ValidNodeType =
  | "FRAME"
  | "COMPONENT"
  | "INSTANCE"
  | "SECTION"
  | "GROUP"
  | "RECTANGLE"
  | "TEXT"
  | "ELLIPSE"
  | "VECTOR";
export type ValidNode =
  | FrameNode
  | GroupNode
  | ComponentNode
  | InstanceNode
  | SectionNode
  | RectangleNode;

export const isValidNodeType = (node: SceneNode): node is ValidNode =>
  node.type === "FRAME" ||
  node.type === "COMPONENT" ||
  node.type === "INSTANCE" ||
  node.type === "SECTION" ||
  node.type === "GROUP" ||
  node.type === "RECTANGLE" ||
  node.type === "TEXT" ||
  node.type === "ELLIPSE" ||
  node.type === "VECTOR";

export const isValidInstance = (node: SceneNode): node is InstanceNode =>
  node.type === "INSTANCE";

export type WithSpacingPaddingBorderRadiusNode =
  | FrameNode
  | ComponentNode
  | InstanceNode;
export const isWithSpacingPaddingBorderRadiusNodeType = (
  node: SceneNode
): node is WithSpacingPaddingBorderRadiusNode =>
  node.type === "FRAME" ||
  node.type === "COMPONENT" ||
  node.type === "INSTANCE";

export type WithColorFillNode =
  | FrameNode
  | ComponentNode
  | InstanceNode
  | RectangleNode
  | TextNode
  | EllipseNode
  | VectorNode;
export const isWithColorFillNodeType = (
  node: SceneNode
): node is WithColorFillNode =>
  node.type === "FRAME" ||
  node.type === "COMPONENT" ||
  node.type === "INSTANCE" ||
  node.type === "RECTANGLE" ||
  node.type === "TEXT" ||
  node.type === "ELLIPSE" ||
  node.type === "VECTOR";

export interface Layout {
  id: string;
  name: string;
  type: ValidNodeType;
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL" | "GRID";
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  cornerRadius?: number | symbol;
  layoutAlign?: "MIN" | "CENTER" | "MAX" | "STRETCH" | "INHERIT";
  width?: number;
  height?: number;
  fills?: ReadonlyArray<Paint> | symbol;
  boundVariables: any;
}
export const validAttributesForSpacingVariables = [
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "paddingBottom",
  "itemSpacing",
] as const;
export const validAttributesForBorderRadiusVariables = [
  "topLeftRadius",
  "topRightRadius",
  "bottomLeftRadius",
  "bottomRightRadius",
] as const;
export const validAttributesForIconSizesVariables = [
  "width",
  "height",
] as const;

export type ApplyVariableKey = "spacing" | "borderRadius" | "iconSizes";
export const mkBindableNodeField = (key: ApplyVariableKey) => {
  switch (key) {
    case "spacing":
      return validAttributesForSpacingVariables;
    case "borderRadius":
      return validAttributesForBorderRadiusVariables;
    case "iconSizes":
      return validAttributesForIconSizesVariables;
  }
};

export const mkLayout = (node: SceneNode): Layout => ({
  id: node.id,
  name: node.name,
  type: node.type as ValidNodeType,
  layoutMode: "layoutMode" in node ? node.layoutMode : undefined,
  itemSpacing: "itemSpacing" in node ? node.itemSpacing : undefined,
  paddingLeft: "paddingLeft" in node ? node.paddingLeft : undefined,
  paddingRight: "paddingRight" in node ? node.paddingRight : undefined,
  paddingTop: "paddingTop" in node ? node.paddingTop : undefined,
  paddingBottom: "paddingBottom" in node ? node.paddingBottom : undefined,
  cornerRadius: "cornerRadius" in node ? node.cornerRadius : undefined,
  layoutAlign: "layoutAlign" in node ? node.layoutAlign : undefined,
  width: "width" in node ? node.width : undefined,
  height: "height" in node ? node.height : undefined,
  fills: "fills" in node ? node.fills : undefined,
  boundVariables: "boundVariables" in node ? node.boundVariables : undefined,
});

export interface ClosestVariable {
  v: Variable;
  valueDifference: number;
  newValue: number;
  originalValue: number;
}

export const clone = (val: symbol | readonly Paint[]) =>
  JSON.parse(JSON.stringify(val));

export const rgbToHex = ({
  r,
  g,
  b,
}: {
  r: number;
  g: number;
  b: number;
}): string => {
  const to255 = (val: number) => Math.round(val * 255);
  const toHex = (val: number) => to255(val).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

export const colorVariableScopeMatchTextNode = (
  node: SceneNode,
  variable: Variable
) =>
  node.type === "TEXT" &&
  (variable.scopes.includes("ALL_SCOPES") ||
    variable.scopes.includes("ALL_FILLS") ||
    variable.scopes.includes("TEXT_FILL"));

export const colorVariableScopeMatchSVGNode = (
  node: SceneNode,
  variable: Variable
) =>
  (node.type === "ELLIPSE" || node.type === "VECTOR") &&
  (variable.scopes.includes("ALL_SCOPES") ||
    variable.scopes.includes("ALL_FILLS") ||
    variable.scopes.includes("TEXT_FILL") ||
    variable.scopes.includes("SHAPE_FILL") ||
    variable.scopes.includes("STROKE_COLOR"));

export const colorVariableScopeMatchWithBgNode = (
  node: SceneNode,
  variable: Variable
) =>
  (node.type === "COMPONENT" ||
    node.type === "FRAME" ||
    node.type === "INSTANCE" ||
    node.type === "SECTION" ||
    node.type === "GROUP" ||
    node.type === "RECTANGLE") &&
  (variable.scopes.includes("ALL_SCOPES") ||
    variable.scopes.includes("ALL_FILLS") ||
    variable.scopes.includes("FRAME_FILL") ||
    variable.scopes.includes("SHAPE_FILL")) &&
  !variable.scopes.includes("TEXT_FILL");

export const variableScopeNone = (variable: Variable) =>
  variable.scopes.length === 0;

export const isMatchScopeVariableAndNodeSet = (
  node: SceneNode,
  variable: Variable
) =>
  colorVariableScopeMatchTextNode(node, variable) ||
  colorVariableScopeMatchSVGNode(node, variable) ||
  colorVariableScopeMatchWithBgNode(node, variable);

const personal_token = "replace_with_your_own_token";

export async function getDesignSystemComponents(fileKey: string) {
  const url = `https://api.figma.com/v1/files/${fileKey}/components`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Figma-Token": personal_token,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`❌ 请求失败: ${res.status} ${res.statusText}`);
  }

  return await res.json();
}
