// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

library Status {

    enum Status {
        INACTIVE,
        ACTIVE,
        QUEUED,
        UPDATING
    }
}