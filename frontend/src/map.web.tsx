// Web shim for react-native-maps. Components render as View placeholders.
import React from "react";
import { View } from "react-native";

export const PROVIDER_DEFAULT = undefined;

const Noop = (props: any) => <View style={props.style}>{props.children}</View>;

export const Marker = Noop as any;
export const Polyline = Noop as any;

export default Noop as any;
