import React from "react";
import "../stylesheets/Loader.css";

const Loader = () => {
    // Return an empty div - the text will be added by CSS
    return (
        <div className="loader-container">
            <div className="loader"></div>
        </div>
    );
};

export default Loader;
