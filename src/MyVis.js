import React from 'react';
import ReactDOM from 'react-dom';
import AppFlow from './AppFlow'; // Import your React Flow component
import "reactflow/dist/style.css";

looker.plugins.visualizations.add({
  id: "react_test",
  label: "React Test",
  options: {
    font_size: {
      type: "string",
      label: "Font Size",
      values: [
        {"Large": "large"},
        {"Small": "small"}
      ],
      display: "radio",
      default: "large"
    }
  },
  create: function(element, config) {
    // Create a container element to host the React Flow component
    this._container = element.appendChild(document.createElement("div"));
    this._container.style.width = "100%";
    this._container.style.height = "100%";

    // Render the React Flow component
    ReactDOM.render(<AppFlow />, this._container);
  },
  updateAsync: function(data, element, config, queryResponse, details, done) {
    // Clear any errors from previous updates
    this.clearErrors();

    // Set the size to the user-selected size
    if (config.font_size === "small") {
      this._container.style.fontSize = "18px";
    } else {
      this._container.style.fontSize = "72px";
    }

    // We are done rendering! Let Looker know.
    done()
  }
});
