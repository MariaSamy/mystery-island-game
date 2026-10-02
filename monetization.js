(function (w) {
  "use strict";

  const state = {
    provider: "none",
    ready: false,
    sdkReady: false,
    hooks: { pause: null, resume: null, mute: null, unmute: null },
  };

  function callHook(name) {
    try {
      const fn = state.hooks[name];
      if (typeof fn === "function") fn();
    } catch (_) {}
  }

  function pauseForAd() {
    callHook("pause");
    callHook("mute");
  }

  function resumeAfterAd() {
    callHook("unmute");
    callHook("resume");
  }

  async function init() {
    // CrazyGames v3: active only on CrazyGames/local environments.
    if (w.CrazyGames && w.CrazyGames.SDK) {
      try {
        await w.CrazyGames.SDK.init();
        const env = w.CrazyGames.SDK.environment;
        if (env && env !== "disabled") {
          state.provider = "crazygames";
          state.ready = true;
          state.sdkReady = true;
          return state.provider;
        }
      } catch (_) {}
    }

    // GameDistribution: becomes active after the official GD script is added
    // with the real gameId supplied by the GD developer dashboard.
    if (w.gdsdk) {
      state.provider = "gamedistribution";
      state.ready = true;
      state.sdkReady = true;
      return state.provider;
    }

    state.provider = "none";
    state.ready = false;
    return state.provider;
  }

  function setHooks(hooks) {
    state.hooks = Object.assign(state.hooks, hooks || {});
  }

  function gameplayStart() {
    try {
      if (state.provider === "crazygames" && w.CrazyGames.SDK.game) {
        w.CrazyGames.SDK.game.gameplayStart();
      }
    } catch (_) {}
  }

  function gameplayStop() {
    try {
      if (state.provider === "crazygames" && w.CrazyGames.SDK.game) {
        w.CrazyGames.SDK.game.gameplayStop();
      }
    } catch (_) {}
  }

  function requestMidgame(reason, done) {
    const finish = function () {
      resumeAfterAd();
      if (typeof done === "function") done();
    };

    if (!state.ready) {
      if (typeof done === "function") done();
      return;
    }

    if (state.provider === "crazygames") {
      try {
        w.CrazyGames.SDK.ad.requestAd("midgame", {
          adStarted: pauseForAd,
          adFinished: finish,
          adError: finish,
        });
        return;
      } catch (_) {
        finish();
        return;
      }
    }

    if (state.provider === "gamedistribution" && w.gdsdk && typeof w.gdsdk.showAd === "function") {
      pauseForAd();
      try {
        Promise.resolve(w.gdsdk.showAd()).then(finish).catch(finish);
      } catch (_) {
        finish();
      }
      return;
    }

    if (typeof done === "function") done();
  }

  function requestRewarded(reason, reward, done) {
    const finishNoReward = function () {
      resumeAfterAd();
      if (typeof done === "function") done(false);
    };
    const finishReward = function () {
      resumeAfterAd();
      try {
        if (typeof reward === "function") reward();
      } catch (_) {}
      if (typeof done === "function") done(true);
    };

    if (!state.ready) {
      if (typeof done === "function") done(false);
      return;
    }

    if (state.provider === "crazygames") {
      try {
        w.CrazyGames.SDK.ad.requestAd("rewarded", {
          adStarted: pauseForAd,
          adFinished: finishReward,
          adError: finishNoReward,
        });
        return;
      } catch (_) {
        finishNoReward();
        return;
      }
    }

    // GD rewarded setup is added after a real gameId/account is available.
    if (typeof done === "function") done(false);
  }

  function getProvider() {
    return state.provider;
  }

  w.MysteryMonetization = {
    init,
    setHooks,
    gameplayStart,
    gameplayStop,
    requestMidgame,
    requestRewarded,
    getProvider,
    state,
  };
})(window);
