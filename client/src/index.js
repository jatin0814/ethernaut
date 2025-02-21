import React, { Suspense, lazy } from "react";
import { createRoot } from 'react-dom/client';
import MediaQuery from "react-responsive";
import { Provider } from "react-redux";
import { store, history } from "./store";
import { syncHistoryWithStore } from "react-router-redux";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import * as ethutil from "./utils/ethutil";
import "bootstrap/dist/css/bootstrap.css";
import "./styles/app.css";
import * as actions from "../src/actions";
import * as constants from "../src/constants";
import "./utils/^^";
import * as Sentry from "@sentry/browser";
import { Integrations } from "@sentry/tracing";
import App from "./containers/App";
import NotFound404 from "./components/NotFound404";
import Header from "./containers/Header";
import MarkdownComponent from "./components/Markdown";
import { loadTranslations } from "./utils/translations";
import Footer from "./components/Footer";
import parse from "html-react-parser";

// For bundle splitting without lazy loading.
const nonlazy = (component) => lazy(() => component);

const Level = nonlazy(import("./containers/Level"));
const Help = nonlazy(import("./containers/Help"));
const Stats = nonlazy(import("./containers/Stats"));

Sentry.init({
  dsn: constants.SENTRY_DSN,
  debug: false,
  tunnel: "/errors",
  integrations: [new Integrations.BrowserTracing()],
  tracesSampleRate: 1.0,
  release: constants.VERSION,
});
// store.dispatch(actions.setNetworkId(id));
store.dispatch(actions.connectWeb3(window.web3));
const container = document.getElementById('root');
const root = createRoot(container);
if (!window.web3) {

  //root.render(<h3>Hey, You dont have the supported wallet!</h3>);
  let language = localStorage.getItem("lang");
  let strings = loadTranslations(language);

  root.render(
    <div>
      {/* Parent container */}
      <main>
          {/* Main title and buttons */}
          <section className="titles">
            <a href={constants.PATH_ROOT}>
              <img
                id="the-ethernaut"
                src="../../imgs/the-ethernaut.svg"
                alt="The-Ethernaut"
                className="the-ethernaut"
                style={{ width: "80%"}}
              />
            </a>
          </section>
          <section className="Description">
              <center>
                <hr />
              </center>
              <div style={{ width: "150%", marginLeft: "-25%" }}>{parse(strings.info)}</div>
          </section>
         
         <center >
          <div className="boxes">

            <h3>Setup Metamask</h3>
            <section>
              <MarkdownComponent target={strings.setupMetamask} />
            </section>

            <h3>Game Mechanics</h3>
            <section>
              <MarkdownComponent target={strings.gameMechanics} />
            </section>

            <h3>Using the console</h3>
            <section>
              <MarkdownComponent target={strings.usingConsole} />
            </section>

            <h3>Beyond the console</h3>
            <section>
              <MarkdownComponent target={strings.beyondConsole} />
            </section>

            <h3>Troubleshooting</h3>
            <section>
              <MarkdownComponent target={strings.troubleshooting} />
            </section>
            </div>
          </center>
         
          {/* Footer */}
          <Provider store={store}><Footer></Footer></Provider>
      </main>
    </div>
  )
} else {
  window.ethereum.request({ method: 'eth_chainId' }).then((res) => {
    store.dispatch(actions.setNetworkId(parseInt(res)));
    store.dispatch(actions.loadGamedata());
  })


  // View entry point.
  root.render(
    <Provider store={store}>
      <Router history={syncHistoryWithStore(history, store)}>
        <Suspense fallback={<div>Loading...</div>}>
            <MediaQuery minWidth={880.1}>
              <Header></Header>
              <Routes>
                <Route path={constants.PATH_HELP} element={<Help/>} />
                <Route path={constants.PATH_LEVEL} element={<Level/>} />
                <Route path={constants.PATH_STATS} element={<Stats/>} />
                <Route exact path="/" element={<App/>} />
                <Route path="/" element={<NotFound404/>} />
              </Routes>
            </MediaQuery>
            <MediaQuery maxWidth={885}>
              <Header></Header>
              <div className="unfitScreenSize">
                <h3>Screen is too small</h3>
                <h3>Please switch to desktop view</h3>
                <a href={constants.PATH_ROOT}>
                  <img
                    id="the-ethernaut"
                    src="../../imgs/the-ethernaut.svg"
                    alt="The-Ethernaut"
                    className="the-ethernaut"
                  />
                </a>
              </div>
            </MediaQuery>
          </Suspense>
      </Router>
    </Provider>
  );
}

// Post-load actions.
window.addEventListener("load", async () => {
  if (window.ethereum) {
    window.web3 = new constants.Web3(window.ethereum);
    try {
      await window.ethereum.request({ method: `eth_requestAccounts` });
    } catch (error) {
      console.error(error);
      console.error(`Refresh the page to approve/reject again`);
      window.web3 = null;
    }
  }

  if (window.web3) {
    ethutil.setWeb3(window.web3);
    ethutil.attachLogger();

    // Initial web3 related actions
    store.dispatch(actions.connectWeb3(window.web3));
    window.web3.eth.getAccounts(function (error, accounts) {
      let player;
      if (accounts.length !== 0 && !error) player = accounts[0];
      store.dispatch(actions.setPlayerAddress(player));
      store.dispatch(actions.loadEthernautContract());
      ethutil.watchAccountChanges((acct) => {
        store.dispatch(actions.setPlayerAddress(acct));
      }, player);
      ethutil.watchNetwork({
        gasPrice: (price) =>
          store.dispatch(actions.setGasPrice(Math.floor(price * 1.1))),
        networkId: (id) => {
          // checkWrongNetwork(id);
          if (id !== store.getState().network.networkId)
            store.dispatch(actions.setNetworkId(id));
        },
        blockNum: (num) => {
          if (num !== store.getState().network.blockNum)
            store.dispatch(actions.setBlockNum(num));
        },
      });
    });
  }
});

// function checkWrongNetwork(id) {
//   let onWrongNetwork = false;
//   if (constants.ACTIVE_NETWORK.id === constants.NETWORKS.LOCAL.id) {
//     onWrongNetwork = Number(id) < 1000;
//   } else {
//     onWrongNetwork =  !constants.ACTIVE_NETWORK.includes(Number(id)) ;
//   }

//   if (onWrongNetwork) {
//     console.error(
//       `Heads up, you're on the wrong network!! @bad Please switch to the << ${constants.ACTIVE_NETWORK.name.toUpperCase()} >> network.`
//     );
//     console.error(
//       `1) From November 2 you can turn on privacy mode (off by default) in settings if you don't want to expose your info by default. 2) If privacy mode is turn on you have to authorized metamask to use this page. 3) then refresh.`
//     );

//     if (id === constants.NETWORKS.ROPSTEN.id) {
//       console.error(
//         `If you want to play on Ropsten, check out https://ropsten.ethernaut.openzeppelin.com/`
//       );
//     }
//   }

//   return onWrongNetwork;
// }
