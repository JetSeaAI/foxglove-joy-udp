import { ExtensionContext } from "@foxglove/extension";
import JoystickUdpPanel from "./JoystickUdpPanel";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "Joystick UDP Panel",
    initPanel: (ctx) => {
      const React = require("react");
      const ReactDOM = require("react-dom/client");
      const root = ReactDOM.createRoot(ctx.panelElement);
      root.render(React.createElement(JoystickUdpPanel));
      return () => root.unmount();
    },
  });
}
