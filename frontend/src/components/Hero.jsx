import React from "react";
import { Link } from "react-router-dom";
import Footer from "./Footer";

const Hero = () => {
  return (
    <>
      {/* hero section */}
      <div className="hero bg-base-200 min-h-screen">
        <div className="hero-content flex flex-col lg:flex-row items-center lg:items-start">
          <div className="mx-10 text-center lg:text-left flex flex-col justify-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold">
              Welcome to BlackBox Messenger!
            </h1>
            <p className="py-6 text-lg sm:text-xl md:text-2xl">
              Experience Seamless and Instant Communication with Your Go-To
              Real-Time Chat Application
            </p>
            <Link to="/signup">
              <button className="btn btn-primary">Get Started</button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Hero;
