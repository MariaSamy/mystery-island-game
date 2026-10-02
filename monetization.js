(function (w) {
  "use strict";

  const state = {
    provider: "none",
    ready: false,
    sdkReady: false,
    rewardedReady: false,
    gdRewardGranted: false,
    gdRewardFn: null,
    gdRewardDone: null,
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

  function handleGDEvent(event) {
    if (!event || !event.name) return;
    if (event.name === "SDK_READY") {
      state.provider = "gamedistribution";
      state.ready = true;
      state.sdkReady = true;
      try {
        if (w.gdsdk && typeof w.gdsdk.preloadAd === "function") {
          Promise.resolve(w.gdsdk.preloadAd("rewarded"))
            .then(function(){ state.rewardedReady = true; })
            .catch(function(){ state.rewardedReady = false; });
        }
      } catch (_) {}
      return;
    }
    if (event.name === "SDK_GAME_PAUSE") {
      pauseForAd();
      return;
    }
    if (event.name === "SDK_REWARDED_WATCH_COMPLETE") {
      state.gdRewardGranted = true;
      try {
        if (typeof state.gdRewardFn === "function") state.gdRewardFn();
      } catch (_) {}
      state.gdRewardFn = null;
      return;
    }
    if (event.name === "SDK_GAME_START") {
      resumeAfterAd();
    }
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
      try {
        Promise.resolve(w.gdsdk.showAd()).then(function () {
          if (typeof done === "function") done();
        }).catch(function () {
          if (typeof done === "function") done();
        });
      } catch (_) {
        if (typeof done === "function") done();
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

    if (state.provider === "gamedistribution" && w.gdsdk && typeof w.gdsdk.showAd === "function") {
      state.gdRewardGranted = false;
      state.gdRewardFn = reward;
      state.gdRewardDone = done;

      var showRewarded = function () {
        try {
          Promise.resolve(w.gdsdk.showAd("rewarded"))
            .then(function () {
              var granted = !!state.gdRewardGranted;
              var cb = state.gdRewardDone;
              state.gdRewardDone = null;
              state.gdRewardFn = null;
              state.rewardedReady = false;
              if (typeof cb === "function") cb(granted);
              try {
                if (w.gdsdk && typeof w.gdsdk.preloadAd === "function") {
                  Promise.resolve(w.gdsdk.preloadAd("rewarded"))
                    .then(function(){ state.rewardedReady = true; })
                    .catch(function(){ state.rewardedReady = false; });
                }
              } catch (_) {}
            })
            .catch(function () {
              var cb = state.gdRewardDone;
              state.gdRewardDone = null;
              state.gdRewardFn = null;
              state.gdRewardGranted = false;
              if (typeof cb === "function") cb(false);
            });
        } catch (_) {
          var cb = state.gdRewardDone;
          state.gdRewardDone = null;
          state.gdRewardFn = null;
          state.gdRewardGranted = false;
          if (typeof cb === "function") cb(false);
        }
      };

      if (!state.rewardedReady && typeof w.gdsdk.preloadAd === "function") {
        try {
          Promise.resolve(w.gdsdk.preloadAd("rewarded"))
            .then(function(){ state.rewardedReady = true; showRewarded(); })
            .catch(function(){
              state.gdRewardFn = null;
              state.gdRewardDone = null;
              if (typeof done === "function") done(false);
            });
        } catch (_) {
          state.gdRewardFn = null;
          state.gdRewardDone = null;
          if (typeof done === "function") done(false);
        }
      } else {
        showRewarded();
      }
      return;
    }

    if (typeof done === "function") done(false);
  }

  function getProvider() {
    return state.provider;
  }

  w.MysteryMonetization = {
    init,
    setHooks,
    handleGDEvent,
    gameplayStart,
    gameplayStop,
    requestMidgame,
    requestRewarded,
    getProvider,
    state,
  };
})(window);
