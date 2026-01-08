# Active shortcut to use make arguments as target arguments
# In TARGETS_AS_COMMAND, list target with argument
ARGS := $(or ${args},${ARGS},)
SUPPORTS_MAKE_ARGS := $(findstring $(firstword $(MAKECMDGOALS)), $(TARGETS_AS_COMMAND))
ifneq "$(SUPPORTS_MAKE_ARGS)" ""
    COMMAND_ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
    $(eval $(COMMAND_ARGS):;@:)
endif
